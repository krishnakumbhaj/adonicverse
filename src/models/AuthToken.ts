import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** `reset-password-code` is the 6-digit emailed code; the others are long single-use tokens. */
export type AuthTokenPurpose = 'verify-email' | 'reset-password' | 'reset-password-code';

/** A single-use emailed token or code. Only its SHA-256 hash is stored; rows expire at `expiresAt`. */
export interface IAuthToken {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  /** Wrong guesses so far (codes only). */
  attempts: number;
  expiresAt: Date;
}

const AuthTokenSchema = new Schema<IAuthToken>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['verify-email', 'reset-password', 'reset-password-code'], required: true },
  tokenHash: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

const AuthTokenModel =
  (mongoose.models.AuthToken as Model<IAuthToken>) || mongoose.model<IAuthToken>('AuthToken', AuthTokenSchema);

export default AuthTokenModel;
