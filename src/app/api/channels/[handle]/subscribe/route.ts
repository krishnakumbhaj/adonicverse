import { Types } from 'mongoose';
import { badRequest, ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import ChannelModel from '@/models/Channel';
import SubscriptionModel from '@/models/Subscription';
import { findChannelByHandle } from '@/server/access';
import { notifyUser } from '@/server/notifications';
import { addOnce, removeOnce } from '@/server/toggles';

type Params = { handle: string };

async function subscriberCount(channelId: Types.ObjectId) {
  const channel = await ChannelModel.findById(channelId).select('stats.subscribers').lean();
  return channel?.stats.subscribers ?? 0;
}

export const POST = route<Params>(async (_request, { handle }) => {
  const user = await requireUser();
  const channel = await findChannelByHandle(handle);
  if (channel.owner.equals(user.id)) throw badRequest("You can't subscribe to your own channel.");

  const userId = new Types.ObjectId(user.id);
  const added = await addOnce(SubscriptionModel, { user: userId, channel: channel._id }, (session) =>
    ChannelModel.updateOne({ _id: channel._id }, { $inc: { 'stats.subscribers': 1 } }, { session }),
  );
  if (added) notifyUser(channel.owner, { type: 'new_subscriber', actor: userId, channel: channel._id });

  return ok({ subscribed: true, subscribers: await subscriberCount(channel._id) });
});

export const DELETE = route<Params>(async (_request, { handle }) => {
  const user = await requireUser();
  const channel = await findChannelByHandle(handle);

  await removeOnce(SubscriptionModel, { user: new Types.ObjectId(user.id), channel: channel._id }, (session) =>
    ChannelModel.updateOne({ _id: channel._id }, { $inc: { 'stats.subscribers': -1 } }, { session }),
  );
  return ok({ subscribed: false, subscribers: await subscriberCount(channel._id) });
});
