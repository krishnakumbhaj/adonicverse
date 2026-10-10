import mongoose, { Schema, type Model, type Types } from 'mongoose';

export const VIEW_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Remembers who viewed an episode recently so one reader counts as one view per day.
 * Rows expire automatically after `VIEW_WINDOW_SECONDS`.
 */
export interface IEpisodeView {
  _id: Types.ObjectId;
  episode: Types.ObjectId;
  /** User id, or a hash of IP + user agent for signed-out readers. */
  viewer: string;
  createdAt: Date;
}

const EpisodeViewSchema = new Schema<IEpisodeView>({
  episode: { type: Schema.Types.ObjectId, ref: 'Episode', required: true },
  viewer: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: VIEW_WINDOW_SECONDS },
});

EpisodeViewSchema.index({ episode: 1, viewer: 1 }, { unique: true });

const EpisodeViewModel =
  (mongoose.models.EpisodeView as Model<IEpisodeView>) ||
  mongoose.model<IEpisodeView>('EpisodeView', EpisodeViewSchema);

export default EpisodeViewModel;
