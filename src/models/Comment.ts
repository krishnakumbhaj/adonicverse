import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * A comment on an episode. Replies are one level deep: `parent` always points
 * at a top-level comment, YouTube style.
 */
export interface IComment {
  _id: Types.ObjectId;
  episode: Types.ObjectId;
  story: Types.ObjectId;
  author: Types.ObjectId;
  parent: Types.ObjectId | null;
  /** Plain text. */
  body: string;
  replyCount: number;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    episode: { type: Schema.Types.ObjectId, ref: 'Episode', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    replyCount: { type: Number, default: 0 },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CommentSchema.index({ episode: 1, parent: 1, createdAt: -1 });
CommentSchema.index({ parent: 1, createdAt: 1 });

const CommentModel =
  (mongoose.models.Comment as Model<IComment>) || mongoose.model<IComment>('Comment', CommentSchema);

export default CommentModel;
