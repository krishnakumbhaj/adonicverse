import type { Types } from 'mongoose';
import { forbidden, notFound, parseId } from '@/lib/api';
import { isAdmin, type SessionUser } from '@/lib/auth';
import ChannelModel, { type IChannel } from '@/models/Channel';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import SeasonModel, { type ISeason } from '@/models/Season';
import StoryModel, { type IStory } from '@/models/Story';

// Who may see and change what. Things a viewer may not see are reported as "not found"
// rather than "forbidden", so drafts don't reveal that they exist.

type Viewer = SessionUser | null;
type IdInput = string | Types.ObjectId;

const toId = (value: IdInput, what: string) => (typeof value === 'string' ? parseId(value, what) : value);

export function canManageChannel(channel: Pick<IChannel, 'owner'>, viewer: Viewer) {
  return Boolean(viewer && (channel.owner.equals(viewer.id) || isAdmin(viewer)));
}

export function canManageStory(story: Pick<IStory, 'author'>, viewer: Viewer) {
  return Boolean(viewer && (story.author.equals(viewer.id) || isAdmin(viewer)));
}

export async function findChannelByHandle(handle: string) {
  const channel = await ChannelModel.findOne({ handle: handle.toLowerCase() }).lean<IChannel>();
  if (!channel) throw notFound('Channel');
  return channel;
}

export async function requireManagedChannel(handle: string, viewer: Viewer) {
  const channel = await findChannelByHandle(handle);
  if (!canManageChannel(channel, viewer)) throw forbidden();
  return channel;
}

/** A story the viewer may read: published, or their own. */
export async function requireReadableStory(storyId: IdInput, viewer: Viewer) {
  const story = await StoryModel.findById(toId(storyId, 'Story')).lean<IStory>();
  if (!story || (story.status !== 'published' && !canManageStory(story, viewer))) throw notFound('Story');
  return story;
}

/** A story the viewer may edit. */
export async function requireManagedStory(storyId: IdInput, viewer: Viewer) {
  const story = await requireReadableStory(storyId, viewer);
  if (!canManageStory(story, viewer)) throw forbidden();
  return story;
}

export async function requireManagedSeason(seasonId: string, viewer: Viewer) {
  const season = await SeasonModel.findById(parseId(seasonId, 'Season')).lean<ISeason>();
  if (!season) throw notFound('Season');
  const story = await requireManagedStory(season.story, viewer);
  return { season, story };
}

/** Readers see an episode only when both it and its story are published. */
export function isEpisodePublic(episode: Pick<IEpisode, 'status'>, story: Pick<IStory, 'status'>) {
  return episode.status === 'published' && story.status === 'published';
}

export async function requireReadableEpisode(episodeId: IdInput, viewer: Viewer, options: { withContent?: boolean } = {}) {
  const episode = await EpisodeModel.findById(toId(episodeId, 'Episode'))
    .select(options.withContent ? '+content' : '')
    .lean<IEpisode>();
  const story = episode && (await StoryModel.findById(episode.story).lean<IStory>());
  if (!episode || !story || !(isEpisodePublic(episode, story) || canManageStory(story, viewer))) {
    throw notFound('Episode');
  }
  return { episode, story };
}

export async function requireManagedEpisode(episodeId: IdInput, viewer: Viewer, options: { withContent?: boolean } = {}) {
  const result = await requireReadableEpisode(episodeId, viewer, options);
  if (!canManageStory(result.story, viewer)) throw forbidden();
  return result;
}

/** An episode readers can see, for actions such as likes and comments that drafts can't receive. */
export async function requirePublicEpisode(episodeId: IdInput, viewer: Viewer) {
  const result = await requireReadableEpisode(episodeId, viewer);
  if (!isEpisodePublic(result.episode, result.story)) {
    throw forbidden('This episode is not published yet.');
  }
  return result;
}
