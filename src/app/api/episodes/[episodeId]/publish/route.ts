import { badRequest, ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import type { IStory } from '@/models/Story';
import { requireManagedEpisode } from '@/server/access';
import { syncStoryEpisodes } from '@/server/aggregates';
import { notifySubscribers } from '@/server/notifications';
import { toEpisode } from '@/server/serializers';

type Params = { episodeId: string };

async function requireSeriesEpisode(episodeId: string) {
  const result = await requireManagedEpisode(episodeId, await requireUser());
  if (result.story.type === 'single') {
    throw badRequest("A single story's episode is published together with the story; publish the story instead.");
  }
  return result;
}

async function respond(episode: IEpisode) {
  const fresh = await EpisodeModel.findById(episode._id).lean<IEpisode>();
  return ok({ episode: toEpisode(fresh ?? episode) });
}

/**
 * Publishes a series episode. Readers see it once the series itself is published;
 * subscribers are notified the first time it goes out in a published series.
 */
export const POST = route<Params>(async (_request, { episodeId }) => {
  const { episode, story } = await requireSeriesEpisode(episodeId);
  if (episode.wordCount === 0) throw badRequest('Write something before publishing this episode.');

  const published = await withTransaction(async (session) => {
    const { modifiedCount } = await EpisodeModel.updateOne(
      { _id: episode._id, status: 'draft' },
      { $set: { status: 'published', publishedAt: episode.publishedAt ?? new Date() } },
      { session },
    );
    await syncStoryEpisodes(story._id, session);
    return modifiedCount === 1;
  });

  if (published && !episode.publishedAt && story.status === 'published') notifyNewEpisode(story, episode);
  return respond(episode);
});

/** Back to draft. The last published episode of a published series can't be unpublished. */
export const DELETE = route<Params>(async (_request, { episodeId }) => {
  const { episode, story } = await requireSeriesEpisode(episodeId);

  await withTransaction(async (session) => {
    await EpisodeModel.updateOne({ _id: episode._id, status: 'published' }, { $set: { status: 'draft' } }, { session });
    const remaining = await syncStoryEpisodes(story._id, session);
    if (story.status === 'published' && remaining === 0) {
      throw badRequest('This is the only published episode. Unpublish the series first.');
    }
  });
  return respond(episode);
});

function notifyNewEpisode(story: IStory, episode: IEpisode) {
  notifySubscribers(story.channel, {
    type: 'new_episode',
    actor: story.author,
    channel: story.channel,
    story: story._id,
    episode: episode._id,
  });
}
