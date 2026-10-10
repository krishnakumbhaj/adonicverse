import type { SortOrder } from 'mongoose';
import { ok, paged, pageWindow, readQuery, route } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import StoryModel, { type IStory } from '@/models/Story';
import { channelStoriesQuery } from '@/schemas/story';
import { canManageChannel, findChannelByHandle } from '@/server/access';
import { toStory } from '@/server/serializers';

const SORTS: Record<'updated' | 'new' | 'popular', Record<string, SortOrder>> = {
  updated: { lastPublishedAt: -1, updatedAt: -1 },
  new: { createdAt: -1 },
  popular: { 'stats.views': -1 },
};

/** The channel's stories. Its owner can also list drafts with `?status=draft` or `?status=all`. */
export const GET = route<{ handle: string }>(async (request, { handle }) => {
  const viewer = await getSessionUser();
  const channel = await findChannelByHandle(handle);
  const query = readQuery(request, channelStoriesQuery);
  const { skip, limit } = pageWindow(query);

  const status = canManageChannel(channel, viewer) ? query.status : 'published';
  const stories = await StoryModel.find({ channel: channel._id, ...(status !== 'all' && { status }) })
    .sort({ ...SORTS[query.sort], _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean<IStory[]>();

  return ok(paged(stories.map((story) => toStory({ ...story, channel })), query));
});
