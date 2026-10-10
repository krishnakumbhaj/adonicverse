import mongoose, { Schema, type Model, type Types } from 'mongoose';
import {
  CONTENT_RATINGS,
  GENRE_SLUGS,
  PUBLISH_STATUSES,
  STORY_PROGRESS,
  STORY_TYPES,
  type ContentRating,
  type PublishStatus,
  type StoryProgress,
  type StoryType,
} from '@/config/content';
import { ImageSchema, multilingualTextIndex, type StoredImage } from './shared';

/**
 * A story is either `single` (one episode, no seasons) or a `series` (seasons of episodes).
 * Readers only see it while `status` is `published`.
 */
export interface IStory {
  _id: Types.ObjectId;
  channel: Types.ObjectId;
  /** The channel owner, copied here so permission checks don't need the channel. */
  author: Types.ObjectId;
  title: string;
  /** Cosmetic, for URLs like `/story/<id>/<slug>`. Lookups always use the id. */
  slug: string;
  synopsis: string;
  poster: StoredImage | null;
  type: StoryType;
  genres: string[];
  tags: string[];
  /** ISO 639-1 code, e.g. `en`, `hi`. */
  language: string;
  contentRating: ContentRating;
  status: PublishStatus;
  progress: StoryProgress;
  /** First time the story was published. */
  publishedAt: Date | null;
  /** Most recent publish date among its published episodes ("last updated"). */
  lastPublishedAt: Date | null;
  latestEpisode: { _id: Types.ObjectId; title: string; publishedAt: Date } | null;
  stats: {
    views: number;
    likes: number;
    comments: number;
    /** Readers who added the story to their library. */
    saves: number;
    /** Published episodes. */
    episodes: number;
    /** Seasons that contain at least one published episode. */
    seasons: number;
    /** Words across published episodes. */
    words: number;
  };
  rating: { count: number; average: number };
  /** For stories imported from a public-domain library (e.g. Gutenberg book 1661), so re-imports skip them. */
  source: { provider: string; id: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true },
    synopsis: { type: String, default: '', maxlength: 2000 },
    poster: { type: ImageSchema, default: null },
    type: { type: String, enum: STORY_TYPES, required: true },
    genres: { type: [{ type: String, enum: GENRE_SLUGS }], default: [] },
    tags: { type: [String], default: [] },
    language: { type: String, default: 'en' },
    contentRating: { type: String, enum: CONTENT_RATINGS, default: 'general' },
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft' },
    progress: { type: String, enum: STORY_PROGRESS, default: 'ongoing' },
    publishedAt: { type: Date, default: null },
    lastPublishedAt: { type: Date, default: null },
    latestEpisode: {
      type: new Schema(
        {
          _id: { type: Schema.Types.ObjectId, required: true },
          title: { type: String, required: true },
          publishedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      episodes: { type: Number, default: 0 },
      seasons: { type: Number, default: 0 },
      words: { type: Number, default: 0 },
    },
    rating: {
      count: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
    },
    source: {
      type: new Schema(
        { provider: { type: String, required: true }, id: { type: String, required: true } },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

StorySchema.index({ channel: 1, status: 1, lastPublishedAt: -1 });
StorySchema.index({ status: 1, lastPublishedAt: -1 });
StorySchema.index({ status: 1, publishedAt: -1 });
StorySchema.index({ status: 1, 'stats.views': -1 });
StorySchema.index({ status: 1, 'stats.likes': -1 });
StorySchema.index({ status: 1, 'rating.average': -1, 'rating.count': -1 });
StorySchema.index({ genres: 1, status: 1 });
StorySchema.index({ tags: 1, status: 1 });
StorySchema.index(
  { 'source.provider': 1, 'source.id': 1 },
  { unique: true, partialFilterExpression: { 'source.provider': { $exists: true } } },
);
StorySchema.index({ title: 'text', tags: 'text', synopsis: 'text' }, {
  ...multilingualTextIndex,
  weights: { title: 10, tags: 5, synopsis: 1 },
});

const StoryModel = (mongoose.models.Story as Model<IStory>) || mongoose.model<IStory>('Story', StorySchema);

export default StoryModel;
