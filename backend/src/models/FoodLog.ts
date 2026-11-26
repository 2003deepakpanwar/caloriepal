import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const FOOD_SOURCES = ['AI', 'MANUAL'] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

const foodItemSchema = new Schema(
  {
    foodName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fats: { type: Number, min: 0 },
  },
  { _id: false },
);

const foodLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    items: { type: [foodItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    totalCalories: { type: Number, required: true, min: 0 },
    source: { type: String, enum: FOOD_SOURCES, required: true },
    imageUrl: { type: String },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  { timestamps: true },
);

foodLogSchema.index({ userId: 1, date: -1 });

export type FoodLogAttrs = InferSchemaType<typeof foodLogSchema>;
export type FoodLogDoc = HydratedDocument<FoodLogAttrs>;
export const FoodLog = mongoose.model<FoodLogAttrs>('FoodLog', foodLogSchema);
