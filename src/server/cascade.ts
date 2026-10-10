import type { ClientSession, FilterQuery, Types } from 'mongoose';
import { badRequest } from '@/lib/api';
import { withTransaction } from '@/lib/db';
import { discardImages } from '@/lib/images';
import ChannelModel, { type IChannel } from '@/models/Channel';
import CommentModel, { type IComment } from '@/models/Comment';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import EpisodeLikeModel from '@/models/EpisodeLike';
import EpisodeViewModel from '@/models/EpisodeView';
import LibraryItemModel from '@/models/LibraryItem';
import NotificationModel from '@/models/Notification';
import ReadingProgressModel from '@/models/ReadingProgress';
import ReviewModel from '@/models/Review';
import SeasonModel from '@/models/Season';
import StoryModel, { type IStory } from '@/models/Story';
import SubscriptionModel from '@/models/Subscription';
import { syncStoryEpisodes } from './aggregates';

// Deletes run in one transaction so a failure never leaves orphaned rows or wrong counters.
// Operations inside a transaction must run one after another, not in parallel.

async function purgeEpisodes(episodeIds: Types.ObjectId[], session: ClientSession) {
  if (episodeIds.length === 0) return;
  const filter = { episode: { $in: episodeIds } };
  await CommentModel.deleteMany(filter, { session });
  await EpisodeLikeModel.deleteMany(filter, { session });
  await EpisodeViewModel.deleteMany(filter, { session });
  await ReadingProgressModel.deleteMany(filter, { session });
  await NotificationModel.deleteMany(filter, { session });
  await EpisodeModel.deleteMany({ _id: { $in: episodeIds } }, { session });
}

/**
 * Deletes the story's episodes matching `filter` (and runs `alsoDelete` in the same transaction),
 * then fixes the story and channel counters. Refuses to leave a published story with no episodes.
 */
async function removeEpisodes(
  story: IStory,
  filter: FilterQuery<IEpisode>,
  alsoDelete?: (session: ClientSession) => Promise<unknown>,
) {
  await withTransaction(async (session) => {
    const episodes = await EpisodeModel.find({ ...filter, story: story._id })
      .select('stats')
      .session(session)
      .lean<Pick<IEpisode, '_id' | 'stats'>[]>();
    const total = (key: keyof IEpisode['stats']) => episodes.reduce((sum, e) => sum + e.stats[key], 0);

    await purgeEpisodes(episodes.map((episode) => episode._id), session);
    await alsoDelete?.(session);
    await StoryModel.updateOne(
      { _id: story._id },
      { $inc: { 'stats.views': -total('views'), 'stats.likes': -total('likes'), 'stats.comments': -total('comments') } },
      { session },
    );
    await ChannelModel.updateOne({ _id: story.channel }, { $inc: { 'stats.views': -total('views') } }, { session });

    const remaining = await syncStoryEpisodes(story._id, session);
    if (story.status === 'published' && remaining === 0) {
      throw badRequest('A published story needs at least one published episode. Unpublish the story first.');
    }
  });
}

export function deleteEpisode(story: IStory, episodeId: Types.ObjectId) {
  return removeEpisodes(story, { _id: episodeId });
}

export function deleteSeason(story: IStory, seasonId: Types.ObjectId) {
  return removeEpisodes(story, { season: seasonId }, (session) =>
    SeasonModel.deleteOne({ _id: seasonId }, { session }),
  );
}

export async function deleteStory(storyId: Types.ObjectId) {
  const poster = await withTransaction(async (session) => {
    const story = await StoryModel.findById(storyId).session(session).lean<IStory>();
    if (!story) return null;

    const episodes = await EpisodeModel.find({ story: story._id }).select('_id').session(session).lean();
    await purgeEpisodes(episodes.map((episode) => episode._id), session);

    const byStory = { story: story._id };
    await SeasonModel.deleteMany(byStory, { session });
    await ReviewModel.deleteMany(byStory, { session });
    await LibraryItemModel.deleteMany(byStory, { session });
    await ReadingProgressModel.deleteMany(byStory, { session });
    await NotificationModel.deleteMany(byStory, { session });
    await StoryModel.deleteOne({ _id: story._id }, { session });
    await ChannelModel.updateOne(
      { _id: story.channel },
      { $inc: { 'stats.views': -story.stats.views, 'stats.stories': story.status === 'published' ? -1 : 0 } },
      { session },
    );
    return story.poster;
  });
  await discardImages([poster]);
}

export async function deleteChannel(channel: IChannel) {
  const posters = await withTransaction(async (session) => {
    const stories = await StoryModel.find({ channel: channel._id })
      .select('poster')
      .session(session)
      .lean<Pick<IStory, '_id' | 'poster'>[]>();
    const storyIds = stories.map((story) => story._id);
    const episodes = await EpisodeModel.find({ story: { $in: storyIds } }).select('_id').session(session).lean();
    await purgeEpisodes(episodes.map((episode) => episode._id), session);

    const byStory = { story: { $in: storyIds } };
    await SeasonModel.deleteMany(byStory, { session });
    await ReviewModel.deleteMany(byStory, { session });
    await LibraryItemModel.deleteMany(byStory, { session });
    await ReadingProgressModel.deleteMany(byStory, { session });
    await NotificationModel.deleteMany({ $or: [byStory, { channel: channel._id }] }, { session });
    await StoryModel.deleteMany({ channel: channel._id }, { session });
    await SubscriptionModel.deleteMany({ channel: channel._id }, { session });
    await ChannelModel.deleteOne({ _id: channel._id }, { session });
    return stories.map((story) => story.poster);
  });
  await discardImages([...posters, channel.avatar, channel.banner]);
}

/** Deletes a comment; deleting a top-level comment also deletes its replies. */
export async function deleteComment(comment: IComment) {
  await withTransaction(async (session) => {
    const ids = [comment._id];
    if (!comment.parent) {
      const replies = await CommentModel.find({ parent: comment._id }).select('_id').session(session).lean();
      ids.push(...replies.map((reply) => reply._id));
    }

    await CommentModel.deleteMany({ _id: { $in: ids } }, { session });
    await NotificationModel.deleteMany({ comment: { $in: ids } }, { session });
    if (comment.parent) {
      await CommentModel.updateOne({ _id: comment.parent }, { $inc: { replyCount: -1 } }, { session });
    }
    const removed = { $inc: { 'stats.comments': -ids.length } };
    await EpisodeModel.updateOne({ _id: comment.episode }, removed, { session });
    await StoryModel.updateOne({ _id: comment.story }, removed, { session });
  });
}
