import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

const suggestedMealSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true },
    rationale: { type: String },
    diffFromRemaining: { type: Number },
  },
  { _id: false },
);

const dinnerRecommendationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    calorieTarget: { type: Number, required: true },
    consumedBeforeDinner: { type: Number, required: true },
    remainingCalories: { type: Number, required: true },
    message: { type: String },
    suggestions: { type: [suggestedMealSchema], default: [] },
    preferences: {
      type: new Schema(
        {
          vegetarianOnly: { type: Boolean, default: false },
          highProteinOnly: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: {},
    },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

dinnerRecommendationSchema.index({ userId: 1, date: 1 }, { unique: true });

export type DinnerRecommendationAttrs = InferSchemaType<typeof dinnerRecommendationSchema>;
export type DinnerRecommendationDoc = HydratedDocument<DinnerRecommendationAttrs>;
export const DinnerRecommendation = mongoose.model<DinnerRecommendationAttrs>(
  'DinnerRecommendation',
  dinnerRecommendationSchema,
);
