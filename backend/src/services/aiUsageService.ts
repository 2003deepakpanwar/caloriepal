import { Types } from 'mongoose';
import { AIUsage } from '../models/AIUsage.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import { env } from '../config/env.js';

export interface UsageResult {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Atomically increment today's AI usage for a user, respecting the daily limit.
 * Uses a conditional update + unique (userId, date) index: when the user is at
 * the limit, the filter no longer matches and upsert races the unique key —
 * resulting in a DuplicateKey error we convert to 429.
 */
export async function consumeAiRequest(userId: string, date: string): Promise<UsageResult> {
  const limit = env.aiDailyLimit;
  try {
    const doc = await AIUsage.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        date,
        requestCount: { $lt: limit },
      },
      { $inc: { requestCount: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return { used: doc.requestCount, limit, remaining: Math.max(0, limit - doc.requestCount) };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(429, `Daily AI limit reached (${limit}/day)`);
    }
    throw err;
  }
}

export async function getUsage(userId: string, date: string): Promise<UsageResult> {
  const doc = await AIUsage.findOne({
    userId: new Types.ObjectId(userId),
    date,
  });
  const used = doc?.requestCount ?? 0;
  const limit = env.aiDailyLimit;
  return { used, limit, remaining: Math.max(0, limit - used) };
}
