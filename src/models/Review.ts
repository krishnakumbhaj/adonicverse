import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A reader's star rating of a story, with an optional written review. One per reader per story. */
export interface IReview {
  _id: Types.ObjectId;
  story: Types.ObjectId;
  author: Types.ObjectId;
  rating: number;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, default: '', trim: true, maxlength: 5000 },
  },
  { timestamps: true },
);

ReviewSchema.index({ story: 1, author: 1 }, { unique: true });
ReviewSchema.index({ story: 1, createdAt: -1 });

const ReviewModel = (mongoose.models.Review as Model<IReview>) || mongoose.model<IReview>('Review', ReviewSchema);

export default ReviewModel;
