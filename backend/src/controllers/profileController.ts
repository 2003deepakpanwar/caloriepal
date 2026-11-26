import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import { computeBmi, computeCalorieGoals } from '../utils/calorieCalculator.js';

const profileSchema = z.object({
  age: z.number().int().min(10).max(100),
  gender: z.enum(['male', 'female']),
  heightCm: z.number().min(50).max(250),
  currentWeightKg: z.number().min(20).max(400),
  targetWeightKg: z.number().min(20).max(400),
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active',
  ]),
  goal: z.enum(['weight_loss', 'maintain', 'weight_gain']),
});

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(404, 'User not found');
    const bmi = user.profile
      ? computeBmi(user.profile.currentWeightKg, user.profile.heightCm)
      : null;
    res.json({
      profile: user.profile,
      calorieGoals: user.calorieGoals,
      bmi,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = profileSchema.parse(req.body);
    const calorieGoals = computeCalorieGoals({
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.currentWeightKg,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
    });
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profile, calorieGoals },
      { new: true },
    );
    if (!user) throw new HttpError(404, 'User not found');
    const bmi = computeBmi(profile.currentWeightKg, profile.heightCm);
    res.json({ profile: user.profile, calorieGoals: user.calorieGoals, bmi });
  } catch (err) {
    next(err);
  }
}
