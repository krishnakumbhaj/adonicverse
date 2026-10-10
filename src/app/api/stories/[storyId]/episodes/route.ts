import { badRequest, notFound, ok, readJson, route } from '@/lib/api';
import { getSessionUser, requireUser } from '@/lib/auth';
import { measureText, sanitizeStoryHtml } from '@/lib/content';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import SeasonModel, { type ISeason } from '@/models/Season';
import { createEpisodeSchema } from '@/schemas/episode';
import { canManageStory, requireManagedStory, requireReadableStory } from '@/server/access';
import { toEpisode, toSeason } from '@/server/serializers';
import { nextOrder } from '@/server/stories';

type Params = { storyId: string };

/**
 * Table of contents. Series episodes are grouped under `seasons`; a single story's episode is in
 * `episodes`. Readers see published episodes only; the author also sees drafts and empty seasons.
 */
export const GET = route<Params>(async (_request, { storyId }) => {
  const viewer = await getSessionUser();
  const story = await requireReadableStory(storyId, viewer);
  const canManage = canManageStory(story, viewer);

  const [seasons, episodes] = await Promise.all([
    SeasonModel.find({ story: story._id }).sort({ order: 1 }).lean<ISeason[]>(),
    EpisodeModel.find({ story: story._id, ...(!canManage && { status: 'published' }) })
      .sort({ order: 1, _id: 1 })
      .lean<IEpisode[]>(),
  ]);

  const bySeason = new Map<string, ReturnType<typeof toEpisode>[]>();
  const withoutSeason: ReturnType<typeof toEpisode>[] = [];
  for (const episode of episodes) {
    if (!episode.season) {
      withoutSeason.push(toEpisode(episode));
      continue;
    }
    const key = episode.season.toString();
    bySeason.set(key, [...(bySeason.get(key) ?? []), toEpisode(episode)]);
  }

  return ok({
    storyId: story._id.toString(),
    type: story.type,
    seasons: seasons
      .map((season) => ({ ...toSeason(season), episodes: bySeason.get(season._id.toString()) ?? [] }))
      .filter((season) => canManage || season.episodes.length > 0),
    episodes: withoutSeason,
  });
});

/** Adds a draft episode to the end of a season of a series. */
export const POST = route<Params>(async (request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  if (story.type === 'single') throw badRequest('A single story has exactly one episode; edit that one instead.');

  const input = await readJson(request, createEpisodeSchema);
  const season = await SeasonModel.findOne({ _id: input.seasonId, story: story._id }).select('_id').lean();
  if (!season) throw notFound('Season');

  const content = sanitizeStoryHtml(input.content);
  const episode = await EpisodeModel.create({
    story: story._id,
    season: season._id,
    title: input.title,
    content,
    ...measureText(content),
    order: await nextOrder('episode', season._id),
  });
  return ok({ episode: toEpisode(episode.toObject()) }, 201);
});
