import { badRequest, ok, readJson, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import SeasonModel from '@/models/Season';
import { createSeasonSchema } from '@/schemas/episode';
import { requireManagedStory } from '@/server/access';
import { toSeason } from '@/server/serializers';
import { nextOrder } from '@/server/stories';

/** Adds a season to the end of a series. Seasons are listed by `GET /api/stories/:id/episodes`. */
export const POST = route<{ storyId: string }>(async (request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  if (story.type === 'single') throw badRequest('Single stories have no seasons.');

  const input = await readJson(request, createSeasonSchema);
  const season = await SeasonModel.create({ story: story._id, ...input, order: await nextOrder('season', story._id) });
  return ok({ season: { ...toSeason(season.toObject()), episodes: [] } }, 201);
});
