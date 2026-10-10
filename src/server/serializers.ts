import type { Types } from 'mongoose';
import type { IChannel } from '@/models/Channel';
import type { IComment } from '@/models/Comment';
import type { IEpisode } from '@/models/Episode';
import type { INotification } from '@/models/Notification';
import type { IReview } from '@/models/Review';
import type { ISeason } from '@/models/Season';
import type { StoredImage } from '@/models/shared';
import type { IStory } from '@/models/Story';
import type { IUser } from '@/models/User';

// These turn database documents into the JSON the API returns, so internal fields
// (password hashes, storage keys, emails of other users) never leak by accident.

export const USER_SUMMARY_FIELDS = 'username displayName avatar';
export const CHANNEL_SUMMARY_FIELDS = 'handle name avatar';
export const STORY_SUMMARY_FIELDS = 'title slug poster type';

export type UserSummaryDoc = Pick<IUser, '_id' | 'username' | 'displayName' | 'avatar'>;
export type ChannelSummaryDoc = Pick<IChannel, '_id' | 'handle' | 'name' | 'avatar'>;
export type StoryDoc = Omit<IStory, 'channel'> & { channel: ChannelSummaryDoc | null };
export type StorySummaryDoc = Pick<IStory, '_id' | 'title' | 'slug' | 'poster' | 'type'>;
export type EpisodeDoc = Omit<IEpisode, 'content'> & { content?: string };
export type CommentDoc = Omit<IComment, 'author'> & { author: UserSummaryDoc | null };
export type ReviewDoc = Omit<IReview, 'author'> & { author: UserSummaryDoc | null };
export type NotificationDoc = Omit<INotification, 'actor' | 'channel' | 'story' | 'episode' | 'comment'> & {
  actor: UserSummaryDoc | null;
  channel: ChannelSummaryDoc | null;
  story: StorySummaryDoc | null;
  episode: Pick<IEpisode, '_id' | 'title'> | null;
  comment: Pick<IComment, '_id' | 'body'> | null;
};

const id = (value: Types.ObjectId) => value.toString();

export function toImage(image: StoredImage | null | undefined) {
  return image ? { url: image.url, width: image.width, height: image.height } : null;
}

export function toUserSummary(user: UserSummaryDoc) {
  return {
    id: id(user._id),
    username: user.username,
    displayName: user.displayName,
    avatar: toImage(user.avatar),
  };
}

export function toProfile(user: IUser) {
  return { ...toUserSummary(user), bio: user.bio, createdAt: user.createdAt };
}

/** The signed-in user's own account. */
export function toAccount(user: IUser) {
  return {
    ...toProfile(user),
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    role: user.role,
  };
}

export function toChannelSummary(channel: ChannelSummaryDoc) {
  return { id: id(channel._id), handle: channel.handle, name: channel.name, avatar: toImage(channel.avatar) };
}

export function toChannel(channel: IChannel) {
  return {
    ...toChannelSummary(channel),
    description: channel.description,
    banner: toImage(channel.banner),
    stats: channel.stats,
    ownerId: id(channel.owner),
    createdAt: channel.createdAt,
  };
}

export function toStorySummary(story: StorySummaryDoc) {
  return { id: id(story._id), title: story.title, slug: story.slug, type: story.type, poster: toImage(story.poster) };
}

export function toStory(story: StoryDoc) {
  return {
    id: id(story._id),
    slug: story.slug,
    title: story.title,
    synopsis: story.synopsis,
    poster: toImage(story.poster),
    type: story.type,
    genres: story.genres,
    tags: story.tags,
    language: story.language,
    contentRating: story.contentRating,
    status: story.status,
    progress: story.progress,
    publishedAt: story.publishedAt,
    lastPublishedAt: story.lastPublishedAt,
    latestEpisode: story.latestEpisode && {
      id: id(story.latestEpisode._id),
      title: story.latestEpisode.title,
      publishedAt: story.latestEpisode.publishedAt,
    },
    stats: story.stats,
    rating: story.rating,
    channel: story.channel && toChannelSummary(story.channel),
    authorId: id(story.author),
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
}

export function toSeason(season: ISeason) {
  return { id: id(season._id), title: season.title, synopsis: season.synopsis, order: season.order };
}

export function toEpisode(episode: EpisodeDoc) {
  return {
    id: id(episode._id),
    storyId: id(episode.story),
    seasonId: episode.season ? id(episode.season) : null,
    title: episode.title,
    order: episode.order,
    status: episode.status,
    wordCount: episode.wordCount,
    readingMinutes: episode.readingMinutes,
    publishedAt: episode.publishedAt,
    stats: episode.stats,
    createdAt: episode.createdAt,
    updatedAt: episode.updatedAt,
    ...(episode.content !== undefined && { content: episode.content }),
  };
}

export function toComment(comment: CommentDoc, storyAuthorId: Types.ObjectId) {
  return {
    id: id(comment._id),
    episodeId: id(comment.episode),
    parentId: comment.parent ? id(comment.parent) : null,
    body: comment.body,
    author: comment.author && toUserSummary(comment.author),
    byStoryAuthor: Boolean(comment.author?._id.equals(storyAuthorId)),
    replyCount: comment.replyCount,
    editedAt: comment.editedAt,
    createdAt: comment.createdAt,
  };
}

export function toReview(review: ReviewDoc) {
  return {
    id: id(review._id),
    storyId: id(review.story),
    rating: review.rating,
    body: review.body,
    author: review.author && toUserSummary(review.author),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function toNotification(notification: NotificationDoc) {
  return {
    id: id(notification._id),
    type: notification.type,
    read: notification.read,
    createdAt: notification.createdAt,
    actor: notification.actor && toUserSummary(notification.actor),
    channel: notification.channel && toChannelSummary(notification.channel),
    story: notification.story && toStorySummary(notification.story),
    episode: notification.episode && { id: id(notification.episode._id), title: notification.episode.title },
    comment: notification.comment && {
      id: id(notification.comment._id),
      excerpt: notification.comment.body.slice(0, 140),
    },
  };
}
