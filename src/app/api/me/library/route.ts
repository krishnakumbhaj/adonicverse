import { ok, paged, pageWindow, readQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import LibraryItemModel, { type ILibraryItem } from '@/models/LibraryItem';
import { paginationSchema } from '@/schemas/common';
import { canManageStory } from '@/server/access';
import { toStory, type StoryDoc } from '@/server/serializers';
import { storyChannelPopulate } from '@/server/stories';

/** Stories the signed-in user saved, most recently saved first. Unpublished stories are skipped. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const page = readQuery(request, paginationSchema);
  const { skip, limit } = pageWindow(page);

  const rows = await LibraryItemModel.find({ user: user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({ path: 'story', populate: storyChannelPopulate })
    .lean<(Omit<ILibraryItem, 'story'> & { story: StoryDoc | null })[]>();

  const result = paged(rows, page);
  return ok({
    ...result,
    items: result.items.flatMap(({ story, createdAt }) =>
      story && (story.status === 'published' || canManageStory(story, user))
        ? [{ story: toStory(story), savedAt: createdAt }]
        : [],
    ),
  });
});
