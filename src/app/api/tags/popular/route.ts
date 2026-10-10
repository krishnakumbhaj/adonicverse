import { ok, route } from '@/lib/api';
import StoryModel from '@/models/Story';

/** The 30 tags used by the most published stories. */
export const GET = route(async () => {
  const tags = await StoryModel.aggregate<{ _id: string; stories: number }>([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', stories: { $sum: 1 } } },
    { $sort: { stories: -1, _id: 1 } },
    { $limit: 30 },
  ]);
  return ok({ items: tags.map(({ _id, stories }) => ({ tag: _id, stories })) });
});
