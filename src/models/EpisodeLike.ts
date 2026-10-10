import mongoose, { Schema, type Model, type Types } from 'mongoose';

export interface IEpisodeLike {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  episode: Types.ObjectId;
  story: Types.ObjectId;
  createdAt: Date;
}

const EpisodeLikeSchema = new Schema<IEpisodeLike>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    episode: { type: Schema.Types.ObjectId, ref: 'Episode', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

EpisodeLikeSchema.index({ episode: 1, user: 1 }, { unique: true });

const EpisodeLikeModel =
  (mongoose.models.EpisodeLike as Model<IEpisodeLike>) ||
  mongoose.model<IEpisodeLike>('EpisodeLike', EpisodeLikeSchema);

export default EpisodeLikeModel;
