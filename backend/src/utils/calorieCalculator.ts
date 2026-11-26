export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type Goal = 'weight_loss' | 'maintain' | 'weight_gain';

const activityFactor: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const goalDelta: Record<Goal, number> = {
  weight_loss: -500,
  maintain: 0,
  weight_gain: 300,
};

export interface CalorieInput {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface CalorieGoals {
  bmr: number;
  tdee: number;
  dailyTarget: number;
}

export function computeBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(2));
}

export function computeCalorieGoals(input: CalorieInput): CalorieGoals {
  const { age, gender, heightCm, weightKg, activityLevel, goal } = input;
  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round(gender === 'male' ? baseBmr + 5 : baseBmr - 161);
  const tdee = Math.round(bmr * activityFactor[activityLevel]);
  const dailyTarget = Math.max(1200, tdee + goalDelta[goal]);
  return { bmr, tdee, dailyTarget };
}
