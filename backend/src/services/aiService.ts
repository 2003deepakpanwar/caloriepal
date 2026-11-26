import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errorMiddleware.js';

const ANALYZE_PROMPT = `You are a food recognition assistant.

Analyze the uploaded food photograph. Identify every visible food item.

For every item return:
- foodName: a short common English name (e.g. "Chapati", "Dal", "White rice", "Paneer curry")
- quantity: a number estimating the amount visible
- unit: one of "pieces", "grams", "ml", "bowls", "cups", "slices", "serving"
- calories: estimated calories for the quantity visible
- protein, carbs, fats: estimated grams for the quantity visible
- confidence: 0 to 1

Guidance:
- Do NOT invent food items that are not visible.
- For plated Indian meals, split components (rice vs dal vs sabzi vs roti).
- If a portion is hard to judge, keep the estimate but set confidence < 0.6.
- Prefer "grams" or "pieces" over vague units like "serving".

Return a JSON object with a single key "items" containing an array of these objects. No commentary.`;

const aiItemSchema = z.object({
  foodName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().min(0),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fats: z.number().min(0).optional(),
  confidence: z.number().min(0).max(1),
});

const aiResponseSchema = z.object({
  items: z.array(aiItemSchema),
});

export type AiFoodItem = z.infer<typeof aiItemSchema>;

const LOOKUP_PROMPT = (name: string, quantity?: number, unit?: string) => {
  const hasPortion = quantity != null && quantity > 0 && unit && unit.trim().length > 0;
  const portionLine = hasPortion
    ? `Portion the user actually has: ${quantity} ${unit}. Return calories and macros for EXACTLY that amount, keeping quantity=${quantity} and unit="${unit}".`
    : `Use one typical standard serving.`;
  return `Estimate calories and macros for this food.

Food: "${name}"
${portionLine}

Return a JSON object with:
- foodName (canonical name)
- quantity (number — the serving size you computed for)
- unit (string — matching the serving unit)
- calories (kcal for that serving)
- protein, carbs, fats (grams for that serving)

For Indian home-cooked foods (roti, dal, idli, poha, paneer, etc.) use standard homemade portions
(e.g. 1 chapati ~ 100 kcal, 1 bowl dal ~ 150 kcal, 2 idlis ~ 80 kcal). Scale linearly with quantity.

Return valid JSON only, no commentary.`;
};

const lookupSchema = z.object({
  foodName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
});

export type LookupResult = z.infer<typeof lookupSchema>;

export function isAiEnabled(): boolean {
  return env.aiApiKey.length > 0;
}

function client(): OpenAI {
  return new OpenAI({ apiKey: env.aiApiKey, baseURL: env.aiBaseUrl });
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [0, 800, 2000];
  let lastErr: unknown;
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      if (status !== 503 && status !== 429 && status !== 500 && status !== 502) throw err;
    }
  }
  const status = (lastErr as { status?: number }).status ?? 502;
  throw new HttpError(
    status === 429 ? 429 : 503,
    status === 429
      ? 'AI rate limit hit. Please wait a moment and retry.'
      : 'AI is temporarily unavailable. Please try again shortly.',
  );
}

function parseJson<T>(text: string | null | undefined, schema: z.ZodType<T>): T {
  if (!text) throw new HttpError(502, 'Empty response from AI');
  // Some models wrap JSON in ```json fences; strip them defensively.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, 'AI returned invalid JSON');
  }
  const r = schema.safeParse(parsed);
  if (!r.success) throw new HttpError(502, 'AI response did not match expected schema');
  return r.data;
}

export async function analyzeFoodImage(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<AiFoodItem[]> {
  if (!isAiEnabled()) {
    throw new HttpError(503, 'AI is not configured (AI_API_KEY missing)');
  }
  const openai = client();
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: env.aiVisionModel,
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ANALYZE_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  );

  const text = response.choices[0]?.message?.content ?? null;
  const parsed = parseJson(text, aiResponseSchema);
  return parsed.items;
}

export async function lookupFoodCalories(
  name: string,
  quantity?: number,
  unit?: string,
): Promise<LookupResult> {
  if (!isAiEnabled()) {
    throw new HttpError(503, 'AI is not configured (AI_API_KEY missing)');
  }
  const openai = client();

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: env.aiTextModel,
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [{ role: 'user', content: LOOKUP_PROMPT(name, quantity, unit) }],
    }),
  );

  const text = response.choices[0]?.message?.content ?? null;
  return parseJson(text, lookupSchema);
}
