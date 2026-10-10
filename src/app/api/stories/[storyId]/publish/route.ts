import { badRequest, ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import ChannelModel from '@/models/Channel';
import EpisodeModel from '@/models/Episode';
import StoryModel from '@/models/Story';
import { requireManagedStory } from '@/server/access';
import { syncStoryEpisodes } from '@/server/aggregates';
import { notifySubscribers } from '@/server/notifications';
import { toStory } from '@/server/serializers';
import { loadStory } from '@/server/stories';

type Params = { storyId: string };

/**
 * Publishes the story. A single story publishes its episode along with it;
 * a series needs at least one published episode first.
 */
export const POST = route<Params>(async (_request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  const firstPublish = !story.publishedAt;

  const changed = await withTransaction(async (session) => {
    if (story.type === 'single') {
      const episode = await EpisodeModel.findOne({ story: story._id }).session(session);
      if (!episode || episode.wordCount === 0) throw badRequest('Write the story before publishing it.');
      if (episode.status !== 'published') {
        episode.status = 'published';
        episode.publishedAt ??= new Date();
        await episode.save({ session });
      }
    } else if (!(await EpisodeModel.exists({ story: story._id, status: 'published' }).session(session))) {
      throw badRequest('Publish at least one episode before publishing the series.');
    }

    const { modifiedCount } = await StoryModel.updateOne(
      { _id: story._id, status: 'draft' },
      { $set: { status: 'published', publishedAt: story.publishedAt ?? new Date() } },
      { session },
    );
    if (modifiedCount === 1) {
      await ChannelModel.updateOne({ _id: story.channel }, { $inc: { 'stats.stories': 1 } }, { session });
    }
    await syncStoryEpisodes(story._id, session);
    return modifiedCount === 1;
  });

  if (changed && firstPublish) {
    notifySubscribers(story.channel, { type: 'new_story', actor: story.author, channel: story.channel, story: story._id });
  }
  return ok({ story: toStory(await loadStory(story._id)) });
});

/** Back to draft: hidden from readers until published again. */
export const DELETE = route<Params>(async (_request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());

  await withTransaction(async (session) => {
    const { modifiedCount } = await StoryModel.updateOne(
      { _id: story._id, status: 'published' },
      { $set: { status: 'draft' } },
      { session },
    );
    if (modifiedCount === 1) {
      await ChannelModel.updateOne({ _id: story.channel }, { $inc: { 'stats.stories': -1 } }, { session });
    }
  });

  return ok({ story: toStory(await loadStory(story._id)) });
});
