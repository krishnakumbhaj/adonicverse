import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A story a reader saved to their private library. */
export interface ILibraryItem {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  story: Types.ObjectId;
  createdAt: Date;
}

const LibraryItemSchema = new Schema<ILibraryItem>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

LibraryItemSchema.index({ user: 1, story: 1 }, { unique: true });
LibraryItemSchema.index({ user: 1, createdAt: -1 });

const LibraryItemModel =
  (mongoose.models.LibraryItem as Model<ILibraryItem>) ||
  mongoose.model<ILibraryItem>('LibraryItem', LibraryItemSchema);

export default LibraryItemModel;
