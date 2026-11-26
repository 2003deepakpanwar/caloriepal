import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

const profileSchema = new Schema(
  {
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    heightCm: { type: Number, required: true },
    currentWeightKg: { type: Number, required: true },
    targetWeightKg: { type: Number, required: true },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
      required: true,
    },
    goal: {
      type: String,
      enum: ['weight_loss', 'maintain', 'weight_gain'],
      required: true,
    },
  },
  { _id: false },
);

const calorieGoalsSchema = new Schema(
  {
    bmr: { type: Number, required: true },
    tdee: { type: Number, required: true },
    dailyTarget: { type: Number, required: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profile: { type: profileSchema, default: null },
    calorieGoals: { type: calorieGoalsSchema, default: null },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = mongoose.model<UserAttrs>('User', userSchema);
