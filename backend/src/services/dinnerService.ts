import { Types } from 'mongoose';
import { MEAL_CATALOGUE, type Meal } from '../data/mealCatalogue.js';
import { DinnerRecommendation, type DinnerRecommendationDoc } from '../models/DinnerRecommendation.js';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import { getDailyBreakdown } from './foodService.js';
import { todayInTimezone } from '../utils/dates.js';
import { suggestCustomDinner } from './aiService.js';

export interface DinnerPreferences {
  vegetarianOnly?: boolean;
  highProteinOnly?: boolean;
}

export interface Suggestion extends Meal {
  rationale: string;
  diffFromRemaining: number;
}

export interface GenerateOptions {
  date?: string;
  preferences?: DinnerPreferences;
  force?: boolean;
}

const MAX_SUGGESTIONS = 4;
const OVERSHOOT_PENALTY = 5;

function filterCatalogue(prefs: DinnerPreferences): Meal[] {
  let meals = MEAL_CATALOGUE;
  if (prefs.vegetarianOnly) meals = meals.filter((m) => m.tags.includes('vegetarian'));
  if (prefs.highProteinOnly) meals = meals.filter((m) => m.tags.includes('high_protein'));
  return meals;
}

export function rankMeals(remaining: number, prefs: DinnerPreferences): {
  message: string | null;
  suggestions: Suggestion[];
} {
  const candidates = filterCatalogue(prefs);
  if (candidates.length === 0) {
    return { message: 'No meals match your preferences — try relaxing them.', suggestions: [] };
  }

  if (remaining < 100) {
    const tiny = candidates
      .filter((m) => m.calories <= 250 && m.tags.includes('light'))
      .slice(0, 2)
      .map<Suggestion>((m) => ({
        ...m,
        rationale: 'Very little calorie room left — a small high-fibre bite is best.',
        diffFromRemaining: remaining - m.calories,
      }));
    return {
      message:
        remaining < 0
          ? `You're ${Math.abs(remaining)} kcal over target. Skip dinner or have a very light bite.`
          : `Only ${remaining} kcal remaining — a cup of tea, fruit, or a small light option is ideal.`,
      suggestions: tiny,
    };
  }

  const scored = candidates
    .map((m) => {
      const diff = remaining - m.calories;
      const penalty = diff >= 0 ? diff : Math.abs(diff) * OVERSHOOT_PENALTY;
      return { meal: m, diff, score: penalty };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_SUGGESTIONS);

  const suggestions = scored.map<Suggestion>(({ meal, diff }) => ({
    ...meal,
    diffFromRemaining: diff,
    rationale:
      diff >= 0
        ? `Fits within your remaining ${remaining} kcal with ${diff} kcal to spare.`
        : `Slightly over budget by ${Math.abs(diff)} kcal — a smaller portion will fit.`,
  }));

  return {
    message: `You have ${remaining} kcal remaining for dinner.`,
    suggestions,
  };
}

export async function generateForUser(
  userId: string,
  options: GenerateOptions = {},
): Promise<DinnerRecommendationDoc> {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.calorieGoals || !user.profile) {
    throw new HttpError(400, 'Profile not configured — set daily calorie target first');
  }

  const timezone = user.timezone ?? 'Asia/Kolkata';
  const date = options.date ?? todayInTimezone(timezone);
  const preferences: DinnerPreferences = options.preferences ?? {};

  const existing = await DinnerRecommendation.findOne({
    userId: new Types.ObjectId(userId),
    date,
  });
  if (existing && !options.force) {
    const cachedPrefs = existing.preferences ?? {};
    const samePrefs =
      (cachedPrefs.vegetarianOnly ?? false) === (preferences.vegetarianOnly ?? false) &&
      (cachedPrefs.highProteinOnly ?? false) === (preferences.highProteinOnly ?? false);
    if (samePrefs) return existing;
    // Preferences changed since last generation — fall through and regenerate.
  }

  const breakdown = await getDailyBreakdown(userId, date);
  const consumedBeforeDinner = breakdown.totalCalories - breakdown.byMeal.dinner;
  const remaining = user.calorieGoals.dailyTarget - consumedBeforeDinner;

  const { message, suggestions } = rankMeals(remaining, preferences);

  const update = {
    userId: new Types.ObjectId(userId),
    date,
    calorieTarget: user.calorieGoals.dailyTarget,
    consumedBeforeDinner,
    remainingCalories: remaining,
    message,
    suggestions,
    preferences,
    generatedAt: new Date(),
  };

  return DinnerRecommendation.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), date },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ) as unknown as DinnerRecommendationDoc;
}

export async function getRecommendation(
  userId: string,
  options: GenerateOptions = {},
): Promise<DinnerRecommendationDoc> {
  return generateForUser(userId, options);
}

export interface CustomDinnerResponse {
  date: string;
  calorieTarget: number;
  consumedBeforeDinner: number;
  remainingCalories: number;
  message: string;
  suggestions: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    rationale: string;
  }>;
  request: string;
}

export async function customDinner(
  userId: string,
  request: string,
  preferences: DinnerPreferences = {},
): Promise<CustomDinnerResponse> {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.calorieGoals || !user.profile) {
    throw new HttpError(400, 'Profile not configured — set daily calorie target first');
  }

  const timezone = user.timezone ?? 'Asia/Kolkata';
  const date = todayInTimezone(timezone);
  const breakdown = await getDailyBreakdown(userId, date);
  const consumedBeforeDinner = breakdown.totalCalories - breakdown.byMeal.dinner;
  const remaining = user.calorieGoals.dailyTarget - consumedBeforeDinner;

  const ai = await suggestCustomDinner({
    remaining,
    request,
    vegetarianOnly: preferences.vegetarianOnly ?? false,
    highProteinOnly: preferences.highProteinOnly ?? false,
  });

  return {
    date,
    calorieTarget: user.calorieGoals.dailyTarget,
    consumedBeforeDinner,
    remainingCalories: remaining,
    message: ai.message,
    suggestions: ai.suggestions,
    request,
  };
}

export async function generateForAllActiveUsers(): Promise<{ generated: number }> {
  const users = await User.find({ calorieGoals: { $ne: null }, profile: { $ne: null } }).select('_id');
  let count = 0;
  for (const u of users) {
    try {
      await generateForUser(u._id.toString(), { force: true });
      count += 1;
    } catch (err) {
      console.error('[dinner-cron] failed for user', u._id.toString(), err);
    }
  }
  return { generated: count };
}
