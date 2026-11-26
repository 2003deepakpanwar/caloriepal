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

  const client = new GoogleGenAI({ apiKey: env.geminiApiKey });

  const response = await client.models.generateContent({
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
  });

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
