import { ok, readJson, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import SeasonModel from '@/models/Season';
import { reorderSchema } from '@/schemas/episode';
import { requireManagedStory } from '@/server/access';
import { assertCompleteOrder } from '@/server/stories';

/** `{ "order": [seasonId, ...] }` — every season of the story, in the new order. */
export const PUT = route<{ storyId: string }>(async (request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  const { order } = await readJson(request, reorderSchema);

  const seasons = await SeasonModel.find({ story: story._id }).select('_id').lean();
  assertCompleteOrder(seasons, order, 'season of the story');

  await SeasonModel.bulkWrite(
    order.map((id, index) => ({
      updateOne: { filter: { _id: id, story: story._id }, update: { $set: { order: index + 1 } } },
    })),
  );
  return ok({ order });
});
