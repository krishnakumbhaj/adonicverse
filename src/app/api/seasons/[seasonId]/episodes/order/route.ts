import { ok, readJson, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import EpisodeModel from '@/models/Episode';
import { reorderSchema } from '@/schemas/episode';
import { requireManagedSeason } from '@/server/access';
import { assertCompleteOrder } from '@/server/stories';

/** `{ "order": [episodeId, ...] }` — every episode of the season, in the new order. */
export const PUT = route<{ seasonId: string }>(async (request, { seasonId }) => {
  const { season } = await requireManagedSeason(seasonId, await requireUser());
  const { order } = await readJson(request, reorderSchema);

  const episodes = await EpisodeModel.find({ season: season._id }).select('_id').lean();
  assertCompleteOrder(episodes, order, 'episode of the season');

  await EpisodeModel.bulkWrite(
    order.map((id, index) => ({
      updateOne: { filter: { _id: id, season: season._id }, update: { $set: { order: index + 1 } } },
    })),
  );
  return ok({ order });
});
