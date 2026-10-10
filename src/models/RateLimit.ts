import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** Request counter for one key in one fixed time window. Rows expire with the window. */
export interface IRateLimit {
  _id: Types.ObjectId;
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

const RateLimitModel =
  (mongoose.models.RateLimit as Model<IRateLimit>) || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);

export default RateLimitModel;
