import { Types } from 'mongoose';
import { FoodLog, MEAL_TYPES, FOOD_SOURCES, type FoodLogDoc } from '../models/FoodLog.js';
import { HttpError } from '../middleware/errorMiddleware.js';

export interface FoodItemInput {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface FoodLogInput {
  mealType: (typeof MEAL_TYPES)[number];
  items: FoodItemInput[];
  source?: (typeof FOOD_SOURCES)[number];
  imageUrl?: string;
  date: string;
}

export function sumCalories(items: FoodItemInput[]): number {
  return items.reduce((s, i) => s + i.calories, 0);
}

export async function createFoodLog(userId: string, input: FoodLogInput): Promise<FoodLogDoc> {
  const totalCalories = sumCalories(input.items);
  return FoodLog.create({
    userId: new Types.ObjectId(userId),
    mealType: input.mealType,
    items: input.items,
    totalCalories,
    source: input.source ?? 'MANUAL',
    imageUrl: input.imageUrl,
    date: input.date,
  });
}

export async function listDailyFoodLogs(userId: string, date: string): Promise<FoodLogDoc[]> {
  return FoodLog.find({ userId: new Types.ObjectId(userId), date }).sort({ createdAt: 1 });
}

export async function findOwnedFoodLog(userId: string, logId: string): Promise<FoodLogDoc> {
  if (!Types.ObjectId.isValid(logId)) throw new HttpError(404, 'Food log not found');
  const log = await FoodLog.findOne({
    _id: new Types.ObjectId(logId),
    userId: new Types.ObjectId(userId),
  });
  if (!log) throw new HttpError(404, 'Food log not found');
  return log;
}

export async function updateFoodLog(
  userId: string,
  logId: string,
  patch: Partial<FoodLogInput>,
): Promise<FoodLogDoc> {
  // Ownership check
  await findOwnedFoodLog(userId, logId);
  const update: Record<string, unknown> = {};
  if (patch.mealType) update.mealType = patch.mealType;
  if (patch.date) update.date = patch.date;
  if (patch.items) {
    update.items = patch.items;
    update.totalCalories = sumCalories(patch.items);
  }
  const log = await FoodLog.findByIdAndUpdate(logId, update, { new: true });
  if (!log) throw new HttpError(404, 'Food log not found');
  return log;
}

export async function deleteFoodLog(userId: string, logId: string): Promise<void> {
  const log = await findOwnedFoodLog(userId, logId);
  await log.deleteOne();
}

export interface DailyBreakdown {
  date: string;
  totalCalories: number;
  byMeal: Record<(typeof MEAL_TYPES)[number], number>;
  totalMacros: { protein: number; carbs: number; fats: number };
}

export async function getDailyBreakdown(userId: string, date: string): Promise<DailyBreakdown> {
  const logs = await listDailyFoodLogs(userId, date);
  const byMeal: Record<(typeof MEAL_TYPES)[number], number> = {
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  };
  const macros = { protein: 0, carbs: 0, fats: 0 };
  let total = 0;
  for (const log of logs) {
    byMeal[log.mealType] += log.totalCalories;
    total += log.totalCalories;
    for (const item of log.items) {
      macros.protein += item.protein ?? 0;
      macros.carbs += item.carbs ?? 0;
      macros.fats += item.fats ?? 0;
    }
  }
  return {
    date,
    totalCalories: Math.round(total),
    byMeal,
    totalMacros: {
      protein: Math.round(macros.protein),
      carbs: Math.round(macros.carbs),
      fats: Math.round(macros.fats),
    },
  };
}
