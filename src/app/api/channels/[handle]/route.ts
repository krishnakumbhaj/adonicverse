import { conflict, notFound, ok, readJson, route } from '@/lib/api';
import { getSessionUser, requireUser } from '@/lib/auth';
import ChannelModel, { type IChannel } from '@/models/Channel';
import SubscriptionModel from '@/models/Subscription';
import UserModel from '@/models/User';
import { updateChannelSchema } from '@/schemas/channel';
import { canManageChannel, findChannelByHandle, requireManagedChannel } from '@/server/access';
import { deleteChannel } from '@/server/cascade';
import { toChannel, toUserSummary, USER_SUMMARY_FIELDS, type UserSummaryDoc } from '@/server/serializers';

type Params = { handle: string };

export const GET = route<Params>(async (_request, { handle }) => {
  const viewer = await getSessionUser();
  const channel = await findChannelByHandle(handle);
  const [owner, subscribed] = await Promise.all([
    UserModel.findById(channel.owner).select(USER_SUMMARY_FIELDS).lean<UserSummaryDoc>(),
    viewer && SubscriptionModel.exists({ user: viewer.id, channel: channel._id }),
  ]);

  return ok({
    channel: toChannel(channel),
    owner: owner && toUserSummary(owner),
    viewer: viewer && { canManage: canManageChannel(channel, viewer), subscribed: Boolean(subscribed) },
  });
});

export const PATCH = route<Params>(async (request, { handle }) => {
  const channel = await requireManagedChannel(handle, await requireUser());
  const input = await readJson(request, updateChannelSchema);

  if (input.handle && input.handle !== channel.handle && (await ChannelModel.exists({ handle: input.handle }))) {
    throw conflict('That handle is taken.', { handle: ['This handle is taken.'] });
  }

  const updated = await ChannelModel.findByIdAndUpdate(channel._id, { $set: input }, { new: true }).lean<IChannel>();
  if (!updated) throw notFound('Channel');
  return ok({ channel: toChannel(updated) });
});

/** Deletes the channel with all of its stories, episodes, comments, reviews and images. */
export const DELETE = route<Params>(async (_request, { handle }) => {
  const channel = await requireManagedChannel(handle, await requireUser());
  await deleteChannel(channel);
  return ok({ deleted: true });
});
