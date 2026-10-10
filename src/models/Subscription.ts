import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A user subscribed to a channel. */
export interface ISubscription {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  channel: Types.ObjectId;
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SubscriptionSchema.index({ user: 1, channel: 1 }, { unique: true });
SubscriptionSchema.index({ user: 1, createdAt: -1 });

const SubscriptionModel =
  (mongoose.models.Subscription as Model<ISubscription>) ||
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

export default SubscriptionModel;
