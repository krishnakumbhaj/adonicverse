import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { PUBLISH_STATUSES, type PublishStatus } from '@/config/content';

/**
 * A readable part of a story. Series episodes belong to a season; the single episode
 * of a `single` story has `season: null`. Readers see it only when both the episode
 * and its story are published.
 */
export interface IEpisode {
  _id: Types.ObjectId;
  story: Types.ObjectId;
  season: Types.ObjectId | null;
  title: string;
  /** Sanitized HTML. Excluded from queries unless selected with `+content`. */
  content: string;
  wordCount: number;
  readingMinutes: number;
  /** Position inside its season. */
  order: number;
  status: PublishStatus;
  /** First time the episode was published. */
  publishedAt: Date | null;
  stats: { views: number; likes: number; comments: number };
  createdAt: Date;
  updatedAt: Date;
}

const EpisodeSchema = new Schema<IEpisode>(
  {
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    season: { type: Schema.Types.ObjectId, ref: 'Season', default: null },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, default: '', select: false },
    wordCount: { type: Number, default: 0 },
    readingMinutes: { type: Number, default: 0 },
    order: { type: Number, required: true },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft' },
    publishedAt: { type: Date, default: null },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

EpisodeSchema.index({ story: 1, season: 1, order: 1 });
EpisodeSchema.index({ story: 1, status: 1, publishedAt: -1 });

const EpisodeModel =
  (mongoose.models.Episode as Model<IEpisode>) || mongoose.model<IEpisode>('Episode', EpisodeSchema);

export default EpisodeModel;
