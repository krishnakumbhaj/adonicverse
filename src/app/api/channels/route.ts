import type { SortOrder } from 'mongoose';
import { LIMITS } from '@/config/content';
import { badRequest, conflict, ok, paged, pageWindow, readJson, readQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import ChannelModel, { type IChannel } from '@/models/Channel';
import { createChannelSchema, listChannelsQuery } from '@/schemas/channel';
import { toChannel } from '@/server/serializers';

/** Browse or search channels. `?q=` searches name, handle and description. */
export const GET = route(async (request) => {
  const query = readQuery(request, listChannelsQuery);
  const { skip, limit } = pageWindow(query);

  if (query.q) await ChannelModel.init(); // the text index must exist before a $text query
  const sort: Record<string, SortOrder | { $meta: 'textScore' }> = query.q
    ? { score: { $meta: 'textScore' } }
    : query.sort === 'new'
      ? { createdAt: -1 }
      : { 'stats.subscribers': -1 };

  const channels = await ChannelModel.find(query.q ? { $text: { $search: query.q } } : {})
    .sort({ ...sort, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean<IChannel[]>();

  return ok(paged(channels.map(toChannel), query));
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, createChannelSchema);

  if ((await ChannelModel.countDocuments({ owner: user.id })) >= LIMITS.channelsPerUser) {
    throw badRequest(`You can have at most ${LIMITS.channelsPerUser} channels.`);
  }
  if (await ChannelModel.exists({ handle: input.handle })) {
    throw conflict('That handle is taken.', { handle: ['This handle is taken.'] });
  }

  const channel = await ChannelModel.create({ ...input, owner: user.id });
  return ok({ channel: toChannel(channel.toObject()) }, 201);
});
