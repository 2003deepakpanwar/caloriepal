import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

const aiUsageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    requestCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

aiUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export type AIUsageAttrs = InferSchemaType<typeof aiUsageSchema>;
export type AIUsageDoc = HydratedDocument<AIUsageAttrs>;
export const AIUsage = mongoose.model<AIUsageAttrs>('AIUsage', aiUsageSchema);
