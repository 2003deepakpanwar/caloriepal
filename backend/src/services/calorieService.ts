import { User } from '../models/User.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import { getDailyBreakdown } from './foodService.js';
import { todayInTimezone, isIsoDate } from '../utils/dates.js';

export interface DailySummary {
  date: string;
  timezone: string;
  calorieTarget: number | null;
  consumedCalories: number;
  remainingCalories: number | null;
  percentOfTarget: number | null;
  mealBreakdown: {
    breakfast: number;
    lunch: number;
    snacks: number;
    dinner: number;
  };
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  profileConfigured: boolean;
}

export async function getDailySummary(userId: string, date?: string): Promise<DailySummary> {
  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(404, 'User not found');
  if (date && !isIsoDate(date)) throw new HttpError(400, 'Invalid date (expected YYYY-MM-DD)');

  const timezone = user.timezone ?? 'Asia/Kolkata';
  const resolvedDate = date ?? todayInTimezone(timezone);
  const breakdown = await getDailyBreakdown(userId, resolvedDate);

  const target = user.calorieGoals?.dailyTarget ?? null;
  const remaining = target != null ? target - breakdown.totalCalories : null;
  const percent = target && target > 0
    ? Math.round((breakdown.totalCalories / target) * 100)
    : null;

  return {
    date: resolvedDate,
    timezone,
    calorieTarget: target,
    consumedCalories: breakdown.totalCalories,
    remainingCalories: remaining,
    percentOfTarget: percent,
    mealBreakdown: breakdown.byMeal,
    macros: breakdown.totalMacros,
    profileConfigured: user.profile != null && user.calorieGoals != null,
  };
}
