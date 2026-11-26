import type { Request, Response, NextFunction } from 'express';
import { getDailySummary } from '../services/calorieService.js';

export async function summary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId as string;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const data = await getDailySummary(userId, date);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
