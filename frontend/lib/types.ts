export type Gender = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';
export type Goal = 'weight_loss' | 'maintain' | 'weight_gain';
export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export type FoodSource = 'AI' | 'MANUAL';

export interface Profile {
  age: number;
  gender: Gender;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface CalorieGoals {
  bmr: number;
  tdee: number;
  dailyTarget: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profile: Profile | null;
  calorieGoals: CalorieGoals | null;
  timezone: string;
}

export interface FoodItem {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface FoodLog {
  _id: string;
  mealType: MealType;
  items: FoodItem[];
  totalCalories: number;
  source: FoodSource;
  imageUrl?: string;
  date: string;
  createdAt: string;
}

export interface DailyBreakdown {
  date: string;
  totalCalories: number;
  byMeal: Record<MealType, number>;
  totalMacros: { protein: number; carbs: number; fats: number };
}

export interface DailySummary {
  date: string;
  timezone: string;
  calorieTarget: number | null;
  consumedCalories: number;
  remainingCalories: number | null;
  percentOfTarget: number | null;
  mealBreakdown: Record<MealType, number>;
  macros: { protein: number; carbs: number; fats: number };
  profileConfigured: boolean;
}

export interface AiFoodItem {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  confidence: number;
}

export interface AiUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface AnalyzeResponse {
  items: AiFoodItem[];
  aiUsage: AiUsage;
}

export interface LookupResult {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface DinnerSuggestion {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  rationale: string;
  diffFromRemaining: number;
}

export interface DinnerRecommendation {
  date: string;
  calorieTarget: number;
  consumedBeforeDinner: number;
  remainingCalories: number;
  message: string | null;
  suggestions: DinnerSuggestion[];
  preferences: { vegetarianOnly?: boolean; highProteinOnly?: boolean };
  generatedAt: string;
}

export interface CustomDinnerSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  rationale: string;
}

export interface CustomDinnerResponse {
  date: string;
  calorieTarget: number;
  consumedBeforeDinner: number;
  remainingCalories: number;
  message: string;
  suggestions: CustomDinnerSuggestion[];
  request: string;
}
