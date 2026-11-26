import { GoogleGenAI, Type } from '@google/genai';
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

Return valid JSON only.`;

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

const LOOKUP_PROMPT = (name: string) => `Estimate calories and macros for one standard serving of this food:

Food name: "${name}"

Return JSON with:
- foodName: canonical name
- quantity: typical serving size as a number
- unit: one of "pieces", "grams", "ml", "bowls", "cups", "slices", "serving"
- calories: kcal for that serving
- protein, carbs, fats: grams for that serving

For Indian home-cooked foods (roti, dal, idli, poha, paneer, etc.) use standard homemade portions
(e.g. 1 chapati ~ 100 kcal, 1 bowl dal ~ 150 kcal, 2 idlis ~ 80 kcal).

Return valid JSON only, no commentary.`;

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
  return env.geminiApiKey.length > 0;
}

export async function analyzeFoodImage(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<AiFoodItem[]> {
  if (!isAiEnabled()) {
    throw new HttpError(503, 'AI vision is not configured (GEMINI_API_KEY missing)');
  }

  const client = new GoogleGenAI({
    apiKey: env.geminiApiKey,
    httpOptions: { apiVersion: 'v1beta' },
  });

  const request = {
    model: env.geminiModel,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
          { text: ANALYZE_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                foodName: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fats: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
              },
              required: ['foodName', 'quantity', 'unit', 'calories', 'confidence'],
            },
          },
        },
        required: ['items'],
      },
    },
  };

  // Free-tier Gemini commonly returns 503/429 during peaks — retry twice with backoff.
  const response = await (async () => {
    const delays = [0, 800, 2000];
    let lastErr: unknown;
    for (const delay of delays) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        return await client.models.generateContent(request);
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number }).status;
        if (status !== 503 && status !== 429) throw err;
      }
    }
    const status = (lastErr as { status?: number }).status ?? 502;
    throw new HttpError(
      status === 503 ? 503 : 429,
      status === 503
        ? 'AI vision is temporarily overloaded. Please try again in a moment.'
        : 'AI vision rate limit hit. Please wait a minute before retrying.',
    );
  })();

  const text = response.text;
  if (!text) throw new HttpError(502, 'Empty response from AI vision model');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(502, 'AI vision model returned invalid JSON');
  }

  const result = aiResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError(502, 'AI vision response did not match expected schema');
  }
  return result.data.items;
}

export async function lookupFoodCalories(name: string): Promise<LookupResult> {
  if (!isAiEnabled()) {
    throw new HttpError(503, 'AI vision is not configured (GEMINI_API_KEY missing)');
  }

  const client = new GoogleGenAI({
    apiKey: env.geminiApiKey,
    httpOptions: { apiVersion: 'v1beta' },
  });

  const request = {
    model: env.geminiModel,
    contents: [{ role: 'user', parts: [{ text: LOOKUP_PROMPT(name) }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          foodName: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fats: { type: Type.NUMBER },
        },
        required: ['foodName', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fats'],
      },
    },
  };

  const response = await (async () => {
    const delays = [0, 600, 1500];
    let lastErr: unknown;
    for (const delay of delays) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        return await client.models.generateContent(request);
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number }).status;
        if (status !== 503 && status !== 429) throw err;
      }
    }
    const status = (lastErr as { status?: number }).status ?? 502;
    throw new HttpError(
      status === 503 ? 503 : 429,
      'Calorie lookup is temporarily unavailable. Please try again in a moment.',
    );
  })();

  const text = response.text;
  if (!text) throw new HttpError(502, 'Empty response from AI');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(502, 'AI returned invalid JSON');
  }
  const result = lookupSchema.safeParse(parsed);
  if (!result.success) throw new HttpError(502, 'AI response did not match expected schema');
  return result.data;
}
