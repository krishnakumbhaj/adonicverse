import mongoose, { Schema, type Model, type Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'new_subscriber',
  'new_story',
  'new_episode',
  'new_comment',
  'comment_reply',
  'new_review',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const NOTIFICATION_TTL_SECONDS = 90 * 24 * 60 * 60;

/** Something that happened that `recipient` should know about. Deleted after 90 days. */
export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  actor: Types.ObjectId | null;
  channel: Types.ObjectId | null;
  story: Types.ObjectId | null;
  episode: Types.ObjectId | null;
  comment: Types.ObjectId | null;
  read: boolean;
  createdAt: Date;
}

const ref = (model: string) => ({ type: Schema.Types.ObjectId, ref: model, default: null });

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  actor: ref('User'),
  channel: ref('Channel'),
  story: ref('Story'),
  episode: ref('Episode'),
  comment: ref('Comment'),
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: NOTIFICATION_TTL_SECONDS },
});

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ story: 1 });
NotificationSchema.index({ channel: 1 });

const NotificationModel =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);

export default NotificationModel;
