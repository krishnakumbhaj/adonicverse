import { notFound, ok, parseId, readJson, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import EpisodeModel from '@/models/Episode';
import ReadingProgressModel from '@/models/ReadingProgress';
import { progressSchema } from '@/schemas/story';
import { canManageStory, isEpisodePublic, requireReadableStory } from '@/server/access';

type Params = { storyId: string };

/**
 * Saves where the reader is: `{ episodeId, position }` with position from 0 (top) to 1 (end).
 * Call it while reading (throttled, e.g. every 10 seconds) and when leaving the page.
 */
export const PUT = route<Params>(async (request, { storyId }) => {
  const user = await requireUser();
  const story = await requireReadableStory(storyId, user);
  const input = await readJson(request, progressSchema);

  const episode = await EpisodeModel.findOne({ _id: input.episodeId, story: story._id }).select('status').lean();
  if (!episode || !(isEpisodePublic(episode, story) || canManageStory(story, user))) throw notFound('Episode');

  const progress = await ReadingProgressModel.findOneAndUpdate(
    { user: user.id, story: story._id },
    { $set: { episode: episode._id, position: input.position } },
    { upsert: true, new: true },
  ).lean();

  return ok({
    progress: { episodeId: progress.episode.toString(), position: progress.position, updatedAt: progress.updatedAt },
  });
});

/** Removes the story from "continue reading". */
export const DELETE = route<Params>(async (_request, { storyId }) => {
  const user = await requireUser();
  await ReadingProgressModel.deleteOne({ user: user.id, story: parseId(storyId, 'Story') });
  return ok({ progress: null });
});
