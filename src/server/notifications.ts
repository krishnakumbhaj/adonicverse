import type { Types } from 'mongoose';
import { after } from 'next/server';
import NotificationModel, { type INotification, type NotificationType } from '@/models/Notification';
import SubscriptionModel from '@/models/Subscription';

type Payload = { type: NotificationType } & Partial<
  Pick<INotification, 'actor' | 'channel' | 'story' | 'episode' | 'comment'>
>;

const BATCH_SIZE = 500;

// Notifications are written after the response is sent, so they never slow down
// or fail the request that caused them.

export function notifyUser(recipient: Types.ObjectId, payload: Payload) {
  if (payload.actor?.equals(recipient)) return;
  after(async () => {
    try {
      await NotificationModel.create({ recipient, ...payload });
    } catch (error) {
      console.error(`Failed to create ${payload.type} notification`, error);
    }
  });
}

export function notifySubscribers(channelId: Types.ObjectId, payload: Payload) {
  after(async () => {
    try {
      let batch: (Payload & { recipient: Types.ObjectId })[] = [];
      const subscribers = SubscriptionModel.find({ channel: channelId }).select('user').lean().cursor();
      for await (const { user } of subscribers) {
        if (payload.actor?.equals(user)) continue;
        batch.push({ recipient: user, ...payload });
        if (batch.length === BATCH_SIZE) {
          await NotificationModel.insertMany(batch, { ordered: false });
          batch = [];
        }
      }
      if (batch.length > 0) await NotificationModel.insertMany(batch, { ordered: false });
    } catch (error) {
      console.error(`Failed to send ${payload.type} notifications for channel ${channelId}`, error);
    }
  });
}
