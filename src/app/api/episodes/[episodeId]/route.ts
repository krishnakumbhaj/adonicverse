import type { UpdateQuery } from 'mongoose';
import { badRequest, notFound, ok, readJson, route } from '@/lib/api';
import { getSessionUser, requireUser } from '@/lib/auth';
import { measureText, sanitizeStoryHtml } from '@/lib/content';
import ChannelModel from '@/models/Channel';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import EpisodeLikeModel from '@/models/EpisodeLike';
import SeasonModel, { type ISeason } from '@/models/Season';
import { updateEpisodeSchema } from '@/schemas/episode';
import { canManageStory, requireManagedEpisode, requireReadableEpisode } from '@/server/access';
import { syncStoryEpisodes } from '@/server/aggregates';
import { deleteEpisode } from '@/server/cascade';
import {
  CHANNEL_SUMMARY_FIELDS,
  toChannelSummary,
  toEpisode,
  toSeason,
  toStorySummary,
  type ChannelSummaryDoc,
} from '@/server/serializers';
import { nextOrder, readingOrder } from '@/server/stories';

type Params = { episodeId: string };

/** The reading page: the episode with its content, its story, and previous/next links. */
export const GET = route<Params>(async (_request, { episodeId }) => {
  const viewer = await getSessionUser();
  const { episode, story } = await requireReadableEpisode(episodeId, viewer, { withContent: true });

  const [order, season, channel, liked] = await Promise.all([
    readingOrder(story._id),
    episode.season && SeasonModel.findById(episode.season).lean<ISeason>(),
    ChannelModel.findById(story.channel).select(CHANNEL_SUMMARY_FIELDS).lean<ChannelSummaryDoc>(),
    viewer && EpisodeLikeModel.exists({ episode: episode._id, user: viewer.id }),
  ]);

  // Drafts aren't in the reading order, so the author previewing one gets no previous/next.
  const index = order.findIndex((item) => item._id.equals(episode._id));
  const link = (item: (typeof order)[number] | undefined) => item && { id: item._id.toString(), title: item.title };

  return ok({
    episode: toEpisode(episode),
    season: season && toSeason(season),
    story: { ...toStorySummary(story), status: story.status, channel: channel && toChannelSummary(channel) },
    navigation: {
      previous: (index > 0 && link(order[index - 1])) || null,
      next: (index >= 0 && link(order[index + 1])) || null,
      position: index >= 0 ? index + 1 : null,
      total: order.length,
    },
    viewer: viewer && { canManage: canManageStory(story, viewer), liked: Boolean(liked) },
  });
});

/** Edit title, content (HTML), or move the episode to another season with `seasonId`. */
export const PATCH = route<Params>(async (request, { episodeId }) => {
  const { episode, story } = await requireManagedEpisode(episodeId, await requireUser());
  const input = await readJson(request, updateEpisodeSchema);

  if (story.type === 'single' && (input.title !== undefined || input.seasonId !== undefined)) {
    throw badRequest("A single story's episode uses the story title and has no season; edit the story instead.");
  }

  const update: UpdateQuery<IEpisode> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.content !== undefined) {
    const content = sanitizeStoryHtml(input.content);
    const measured = measureText(content);
    if (episode.status === 'published' && measured.wordCount === 0) {
      throw badRequest("A published episode can't be empty. Unpublish it first.");
    }
    Object.assign(update, { content, ...measured });
  }
  if (input.seasonId !== undefined && !episode.season?.equals(input.seasonId)) {
    const season = await SeasonModel.findOne({ _id: input.seasonId, story: story._id }).select('_id').lean();
    if (!season) throw notFound('Season');
    Object.assign(update, { season: season._id, order: await nextOrder('episode', season._id) });
  }

  const updated = await EpisodeModel.findByIdAndUpdate(episode._id, { $set: update }, { new: true })
    .select('+content')
    .lean<IEpisode>();
  if (!updated) throw notFound('Episode');
  if (updated.status === 'published') await syncStoryEpisodes(story._id);

  return ok({ episode: toEpisode(updated) });
});

/** Deletes a series episode with its comments and likes. */
export const DELETE = route<Params>(async (_request, { episodeId }) => {
  const { episode, story } = await requireManagedEpisode(episodeId, await requireUser());
  if (story.type === 'single') throw badRequest("A single story's episode can't be deleted; delete the story instead.");

  await deleteEpisode(story, episode._id);
  return ok({ deleted: true });
});
