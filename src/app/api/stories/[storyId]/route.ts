import { badRequest, ok, readJson, route } from '@/lib/api';
import { getSessionUser, requireUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { slugify } from '@/lib/slug';
import EpisodeModel from '@/models/Episode';
import LibraryItemModel from '@/models/LibraryItem';
import ReadingProgressModel from '@/models/ReadingProgress';
import ReviewModel from '@/models/Review';
import StoryModel from '@/models/Story';
import SubscriptionModel from '@/models/Subscription';
import { updateStorySchema } from '@/schemas/story';
import { canManageStory, requireManagedStory, requireReadableStory } from '@/server/access';
import { deleteStory } from '@/server/cascade';
import { toStory } from '@/server/serializers';
import { loadStory } from '@/server/stories';

type Params = { storyId: string };

/** The story, plus what the signed-in viewer has done with it (library, rating, progress). */
export const GET = route<Params>(async (_request, { storyId }) => {
  const viewer = await getSessionUser();
  const { _id } = await requireReadableStory(storyId, viewer);
  const story = await loadStory(_id);

  if (!viewer) return ok({ story: toStory(story), viewer: null });

  const [inLibrary, review, progress, subscribed] = await Promise.all([
    LibraryItemModel.exists({ user: viewer.id, story: _id }),
    ReviewModel.findOne({ author: viewer.id, story: _id }).select('rating body').lean(),
    ReadingProgressModel.findOne({ user: viewer.id, story: _id }).select('episode position updatedAt').lean(),
    story.channel && SubscriptionModel.exists({ user: viewer.id, channel: story.channel._id }),
  ]);

  return ok({
    story: toStory(story),
    viewer: {
      canManage: canManageStory(story, viewer),
      inLibrary: Boolean(inLibrary),
      subscribedToChannel: Boolean(subscribed),
      review: review && { rating: review.rating, body: review.body },
      progress: progress && {
        episodeId: progress.episode.toString(),
        position: progress.position,
        updatedAt: progress.updatedAt,
      },
    },
  });
});

export const PATCH = route<Params>(async (request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  const input = await readJson(request, updateStorySchema);
  if (input.progress && story.type === 'single') {
    throw badRequest('Single stories are always complete.', { progress: ['Only series have progress.'] });
  }

  await withTransaction(async (session) => {
    await StoryModel.updateOne(
      { _id: story._id },
      { $set: { ...input, ...(input.title && { slug: slugify(input.title) }) } },
      { session },
    );
    // A single story's episode carries the story's title.
    if (input.title && story.type === 'single') {
      await EpisodeModel.updateOne({ story: story._id }, { $set: { title: input.title } }, { session });
    }
  });

  return ok({ story: toStory(await loadStory(story._id)) });
});

/** Deletes the story with its seasons, episodes, comments, reviews and poster. */
export const DELETE = route<Params>(async (_request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  await deleteStory(story._id);
  return ok({ deleted: true });
});
