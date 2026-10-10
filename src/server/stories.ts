import type { Types } from 'mongoose';
import { badRequest, notFound } from '@/lib/api';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import SeasonModel, { type ISeason } from '@/models/Season';
import StoryModel from '@/models/Story';
import { CHANNEL_SUMMARY_FIELDS, type StoryDoc } from './serializers';

export const storyChannelPopulate = { path: 'channel', select: CHANNEL_SUMMARY_FIELDS };

export async function loadStory(storyId: Types.ObjectId) {
  const story = await StoryModel.findById(storyId).populate(storyChannelPopulate).lean<StoryDoc>();
  if (!story) throw notFound('Story');
  return story;
}

/** Next `order` value for a new season of a story or a new episode of a season. */
export async function nextOrder(model: 'season' | 'episode', parentId: Types.ObjectId) {
  const last =
    model === 'season'
      ? await SeasonModel.findOne({ story: parentId }).sort({ order: -1 }).select('order').lean()
      : await EpisodeModel.findOne({ season: parentId }).sort({ order: -1 }).select('order').lean();
  return (last?.order ?? 0) + 1;
}

/** A reorder request must list every existing item exactly once. */
export function assertCompleteOrder(existing: { _id: Types.ObjectId }[], order: string[], what: string) {
  const ids = new Set(existing.map((item) => item._id.toString()));
  if (order.length !== ids.size || order.some((id) => !ids.has(id))) {
    throw badRequest(`Send every ${what} exactly once, in the new order.`);
  }
}

/**
 * Published episodes in reading order: by season order, then episode order.
 * Used for previous/next navigation.
 */
export async function readingOrder(storyId: Types.ObjectId) {
  const [seasons, episodes] = await Promise.all([
    SeasonModel.find({ story: storyId }).sort({ order: 1 }).select('_id').lean<Pick<ISeason, '_id'>[]>(),
    EpisodeModel.find({ story: storyId, status: 'published' })
      .select('title season order')
      .lean<Pick<IEpisode, '_id' | 'title' | 'season' | 'order'>[]>(),
  ]);
  const seasonRank = new Map(seasons.map((season, index) => [season._id.toString(), index]));
  const rank = (episode: Pick<IEpisode, 'season'>) => (episode.season ? seasonRank.get(episode.season.toString()) ?? 0 : 0);
  return episodes.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
}
