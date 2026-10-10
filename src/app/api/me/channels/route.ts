import { ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import ChannelModel, { type IChannel } from '@/models/Channel';
import { toChannel } from '@/server/serializers';

/** Channels the signed-in user owns. */
export const GET = route(async () => {
  const user = await requireUser();
  const channels = await ChannelModel.find({ owner: user.id }).sort({ createdAt: 1 }).lean<IChannel[]>();
  return ok({ items: channels.map(toChannel) });
});
