import { createHash } from 'node:crypto';
import { clientIp, ok, route } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import ChannelModel from '@/models/Channel';
import EpisodeModel from '@/models/Episode';
import EpisodeViewModel from '@/models/EpisodeView';
import StoryModel from '@/models/Story';
import { canManageStory, isEpisodePublic, requireReadableEpisode } from '@/server/access';

/**
 * Counts a view. Call it once the reader has actually started reading (for example after a few
 * seconds on the page), not on page load. Each reader counts once per episode per 24 hours,
 * and authors reading their own work don't count.
 */
export const POST = route<{ episodeId: string }>(async (request, { episodeId }) => {
  const viewer = await getSessionUser();
  const { episode, story } = await requireReadableEpisode(episodeId, viewer);
  if (!isEpisodePublic(episode, story) || canManageStory(story, viewer)) {
    return ok({ counted: false, views: episode.stats.views });
  }

  const visitor = viewer
    ? `user:${viewer.id}`
    : `anon:${createHash('sha256')
        .update(`${clientIp(request.headers)}|${request.headers.get('user-agent') ?? ''}`)
        .digest('hex')
        .slice(0, 32)}`;

  try {
    await EpisodeViewModel.create({ episode: episode._id, viewer: visitor });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return ok({ counted: false, views: episode.stats.views });
    throw error;
  }

  const view = { $inc: { 'stats.views': 1 } };
  await Promise.all([
    EpisodeModel.updateOne({ _id: episode._id }, view),
    StoryModel.updateOne({ _id: story._id }, view),
    ChannelModel.updateOne({ _id: story.channel }, view),
  ]);
  return ok({ counted: true, views: episode.stats.views + 1 });
});
