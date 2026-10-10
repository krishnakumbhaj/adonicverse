import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * A sign-up waiting for its emailed code. The account is created only once the code is entered,
 * so a mistyped email never leaves an account behind. One per email; rows expire at `expiresAt`.
 */
export interface IPendingSignup {
  _id: Types.ObjectId;
  email: string;
  username: string;
  displayName: string | null;
  passwordHash: string;
  /** SHA-256 of the email and the 6-digit code. */
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

const PendingSignupSchema = new Schema<IPendingSignup>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  displayName: { type: String, default: null },
  passwordHash: { type: String, required: true, select: false },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

const PendingSignupModel =
  (mongoose.models.PendingSignup as Model<IPendingSignup>) ||
  mongoose.model<IPendingSignup>('PendingSignup', PendingSignupSchema);

export default PendingSignupModel;
