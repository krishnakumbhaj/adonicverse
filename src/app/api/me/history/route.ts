import { ok, paged, pageWindow, readQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import type { IEpisode } from '@/models/Episode';
import ReadingProgressModel, { type IReadingProgress } from '@/models/ReadingProgress';
import { paginationSchema } from '@/schemas/common';
import { canManageStory } from '@/server/access';
import { toStory, type StoryDoc } from '@/server/serializers';
import { storyChannelPopulate } from '@/server/stories';

type Row = Omit<IReadingProgress, 'story' | 'episode'> & {
  story: StoryDoc | null;
  episode: Pick<IEpisode, '_id' | 'title' | 'season' | 'order'> | null;
};

/** "Continue reading": stories the user has started, most recently read first. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const page = readQuery(request, paginationSchema);
  const { skip, limit } = pageWindow(page);

  const rows = await ReadingProgressModel.find({ user: user.id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({ path: 'story', populate: storyChannelPopulate })
    .populate({ path: 'episode', select: 'title season order' })
    .lean<Row[]>();

  const result = paged(rows, page);
  return ok({
    ...result,
    items: result.items.flatMap(({ story, episode, position, updatedAt }) =>
      story && (story.status === 'published' || canManageStory(story, user))
        ? [{
            story: toStory(story),
            episode: episode && { id: episode._id.toString(), title: episode.title },
            position,
            updatedAt,
          }]
        : [],
    ),
  });
});
