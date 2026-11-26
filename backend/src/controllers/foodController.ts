import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MEAL_TYPES, FOOD_SOURCES } from '../models/FoodLog.js';
import { User } from '../models/User.js';
import {
  createFoodLog,
  deleteFoodLog,
  findOwnedFoodLog,
  getDailyBreakdown,
  listDailyFoodLogs,
  updateFoodLog,
} from '../services/foodService.js';
import { isIsoDate, todayInTimezone } from '../utils/dates.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import { analyzeFoodImage, lookupFoodCalories } from '../services/aiService.js';
import { consumeAiRequest, getUsage } from '../services/aiUsageService.js';

const foodItemSchema = z.object({
  foodName: z.string().min(1).max(120),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(40),
  calories: z.number().min(0),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fats: z.number().min(0).optional(),
});

const createSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  items: z.array(foodItemSchema).min(1),
  source: z.enum(FOOD_SOURCES).optional(),
  imageUrl: z.string().url().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateSchema = z.object({
  mealType: z.enum(MEAL_TYPES).optional(),
  items: z.array(foodItemSchema).min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function resolveDate(userId: string, provided?: string): Promise<string> {
  if (provided) {
    if (!isIsoDate(provided)) throw new HttpError(400, 'Invalid date (expected YYYY-MM-DD)');
    return provided;
  }
  const user = await User.findById(userId).select('timezone').lean();
  return todayInTimezone(user?.timezone ?? 'Asia/Kolkata');
}

export async function createManual(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const userId = req.userId as string;
    const date = await resolveDate(userId, body.date);
    const log = await createFoodLog(userId, {
      mealType: body.mealType,
      items: body.items,
      source: body.source ?? 'MANUAL',
      imageUrl: body.imageUrl,
      date,
    });
    const breakdown = await getDailyBreakdown(userId, date);
    res.status(201).json({ foodLog: log, daily: breakdown });
  } catch (err) {
    next(err);
  }
}

export async function listDaily(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId as string;
    const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
    const date = await resolveDate(userId, dateParam);
    const [logs, breakdown] = await Promise.all([
      listDailyFoodLogs(userId, date),
      getDailyBreakdown(userId, date),
    ]);
    res.json({ date, logs, daily: breakdown });
  } catch (err) {
    next(err);
  }
}

export async function updateLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patch = updateSchema.parse(req.body);
    const userId = req.userId as string;
    const id = req.params['id'] as string;
    const log = await updateFoodLog(userId, id, patch);
    const breakdown = await getDailyBreakdown(userId, log.date);
    res.json({ foodLog: log, daily: breakdown });
  } catch (err) {
    next(err);
  }
}

export async function deleteLogHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId as string;
    const id = req.params['id'] as string;
    const log = await findOwnedFoodLog(userId, id);
    const { date } = log;
    await deleteFoodLog(userId, id);
    const breakdown = await getDailyBreakdown(userId, date);
    res.json({ deleted: true, daily: breakdown });
  } catch (err) {
    next(err);
  }
}

export async function analyzeImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) throw new HttpError(400, 'No image uploaded (field name: "image")');
    const userId = req.userId as string;
    const date = await resolveDate(userId);

    // Count the request first so a slow AI call can't be double-spent.
    const usage = await consumeAiRequest(userId, date);

    const items = await analyzeFoodImage(req.file.buffer, req.file.mimetype);

    res.json({
      items,
      aiUsage: usage,
      // not saved — the client should let the user edit and then POST /api/food/manual
      // with source="AI" to confirm.
      note: 'Review items with the user before saving via POST /api/food/manual',
    });
  } catch (err) {
    next(err);
  }
}

export async function getAiUsage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId as string;
    const date = await resolveDate(userId);
    const usage = await getUsage(userId, date);
    res.json({ date, ...usage });
  } catch (err) {
    next(err);
  }
}

export async function lookupCalories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) throw new HttpError(400, 'Query must be at least 2 characters');
    if (q.length > 100) throw new HttpError(400, 'Query too long');
    const result = await lookupFoodCalories(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
