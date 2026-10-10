import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { ImageSchema, multilingualTextIndex, type StoredImage } from './shared';

export interface IChannel {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  /** Lowercase, unique. Used in channel URLs (`/@handle`). */
  handle: string;
  name: string;
  description: string;
  avatar: StoredImage | null;
  banner: StoredImage | null;
  stats: {
    subscribers: number;
    /** Published stories. */
    stories: number;
    views: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 1000 },
    avatar: { type: ImageSchema, default: null },
    banner: { type: ImageSchema, default: null },
    stats: {
      subscribers: { type: Number, default: 0 },
      stories: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

ChannelSchema.index({ 'stats.subscribers': -1 });
ChannelSchema.index({ name: 'text', handle: 'text', description: 'text' }, {
  ...multilingualTextIndex,
  weights: { name: 5, handle: 5, description: 1 },
});

const ChannelModel =
  (mongoose.models.Channel as Model<IChannel>) || mongoose.model<IChannel>('Channel', ChannelSchema);

export default ChannelModel;
