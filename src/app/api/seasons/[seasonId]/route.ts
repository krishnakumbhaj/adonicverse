import { notFound, ok, readJson, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import SeasonModel, { type ISeason } from '@/models/Season';
import { updateSeasonSchema } from '@/schemas/episode';
import { requireManagedSeason } from '@/server/access';
import { deleteSeason } from '@/server/cascade';
import { toSeason } from '@/server/serializers';

type Params = { seasonId: string };

export const PATCH = route<Params>(async (request, { seasonId }) => {
  const { season } = await requireManagedSeason(seasonId, await requireUser());
  const input = await readJson(request, updateSeasonSchema);

  const updated = await SeasonModel.findByIdAndUpdate(season._id, { $set: input }, { new: true }).lean<ISeason>();
  if (!updated) throw notFound('Season');
  return ok({ season: toSeason(updated) });
});

/** Deletes the season and every episode in it. */
export const DELETE = route<Params>(async (_request, { seasonId }) => {
  const { season, story } = await requireManagedSeason(seasonId, await requireUser());
  await deleteSeason(story, season._id);
  return ok({ deleted: true });
});
