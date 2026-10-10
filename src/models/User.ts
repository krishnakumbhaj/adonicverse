import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { ImageSchema, type StoredImage } from './shared';

export interface IUser {
  _id: Types.ObjectId;
  /** Lowercase, unique. Used in profile URLs and for signing in. */
  username: string;
  /** Lowercase, unique. */
  email: string;
  /** Excluded from queries unless selected with `+passwordHash`. Missing for accounts that only use Google sign-in. */
  passwordHash?: string;
  /** The Google account (`sub`) linked by signing in with Google. */
  googleId?: string;
  displayName: string;
  bio: string;
  avatar: StoredImage | null;
  role: 'user' | 'admin';
  emailVerifiedAt: Date | null;
  /** Last time the password was reset with "Forgot password"; that's allowed once a day. */
  passwordResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    bio: { type: String, default: '', maxlength: 300 },
    avatar: { type: ImageSchema, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    emailVerifiedAt: { type: Date, default: null },
    passwordResetAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const UserModel = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
