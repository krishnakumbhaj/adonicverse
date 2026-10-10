import { notFound, ok, route } from '@/lib/api';
import ChannelModel, { type IChannel } from '@/models/Channel';
import UserModel, { type IUser } from '@/models/User';
import { toChannel, toProfile } from '@/server/serializers';

/** Public profile and the user's channels. */
export const GET = route<{ username: string }>(async (_request, { username }) => {
  const user = await UserModel.findOne({ username: username.toLowerCase() }).lean<IUser>();
  if (!user) throw notFound('User');

  const channels = await ChannelModel.find({ owner: user._id }).sort({ createdAt: 1 }).lean<IChannel[]>();
  return ok({ user: toProfile(user), channels: channels.map(toChannel) });
});
