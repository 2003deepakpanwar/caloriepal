import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import {
  customDinner,
  generateForAllActiveUsers,
  generateForUser,
  getRecommendation,
} from '../services/dinnerService.js';

const preferencesSchema = z
  .object({
    vegetarianOnly: z.boolean().optional(),
    highProteinOnly: z.boolean().optional(),
  })
  .optional();

function parseBoolQuery(v: unknown): boolean {
  return v === 'true' || v === '1';
}

export async function getRecommendationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId as string;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const preferences = {
      vegetarianOnly: parseBoolQuery(req.query.vegetarianOnly),
      highProteinOnly: parseBoolQuery(req.query.highProteinOnly),
    };
    const rec = await getRecommendation(userId, { date, preferences });
    res.json(rec);
  } catch (err) {
    next(err);
  }
}

export async function generateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId as string;
    const preferences = preferencesSchema.parse(req.body?.preferences);
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    const rec = await generateForUser(userId, { date, preferences, force: true });
    res.json(rec);
  } catch (err) {
    next(err);
  }
}

const customBodySchema = z.object({
  request: z.string().min(2).max(500),
  preferences: preferencesSchema,
});

export async function customHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId as string;
    const body = customBodySchema.parse(req.body);
    const result = await customDinner(userId, body.request, body.preferences);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cronHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const secret = env.cronSecret;
    if (!secret) throw new HttpError(503, 'Cron endpoint disabled (CRON_SECRET missing)');
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || token !== secret) {
      throw new HttpError(401, 'Invalid cron secret');
    }
    const result = await generateForAllActiveUsers();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}
