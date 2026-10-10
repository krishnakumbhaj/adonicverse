import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A season of a series. Shown as "Season N" (by `order`) when it has no title. */
export interface ISeason {
  _id: Types.ObjectId;
  story: Types.ObjectId;
  title: string;
  synopsis: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeasonSchema = new Schema<ISeason>(
  {
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    title: { type: String, default: '', trim: true, maxlength: 100 },
    synopsis: { type: String, default: '', maxlength: 1000 },
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

SeasonSchema.index({ story: 1, order: 1 });

const SeasonModel = (mongoose.models.Season as Model<ISeason>) || mongoose.model<ISeason>('Season', SeasonSchema);

export default SeasonModel;
