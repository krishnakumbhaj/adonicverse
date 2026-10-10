import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** Where a reader is in a story, for "continue reading". One row per reader per story. */
export interface IReadingProgress {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  story: Types.ObjectId;
  episode: Types.ObjectId;
  /** Scroll position inside the episode, from 0 to 1. */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingProgressSchema = new Schema<IReadingProgress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    episode: { type: Schema.Types.ObjectId, ref: 'Episode', required: true, index: true },
    position: { type: Number, default: 0, min: 0, max: 1 },
  },
  { timestamps: true },
);

ReadingProgressSchema.index({ user: 1, story: 1 }, { unique: true });
ReadingProgressSchema.index({ user: 1, updatedAt: -1 });

const ReadingProgressModel =
  (mongoose.models.ReadingProgress as Model<IReadingProgress>) ||
  mongoose.model<IReadingProgress>('ReadingProgress', ReadingProgressSchema);

export default ReadingProgressModel;
