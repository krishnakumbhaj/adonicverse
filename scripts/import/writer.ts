import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose, { type Types } from 'mongoose';
import { RESERVED_NAMES, type ContentRating, type GenreSlug } from '@/config/content';
import { measureText, sanitizeStoryHtml } from '@/lib/content';
import { withTransaction } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { imageStorage } from '@/lib/storage';
import ChannelModel, { type IChannel } from '@/models/Channel';
import EpisodeModel from '@/models/Episode';
import SeasonModel from '@/models/Season';
import type { StoredImage } from '@/models/shared';
import StoryModel from '@/models/Story';
import UserModel from '@/models/User';
import { syncStoryEpisodes } from '@/server/aggregates';
import type { Artwork } from './poster';
import type { ParsedBook } from './text-structure';
import { hashOf } from './util';

// Saves imported stories straight to MongoDB with the same models and rules as the API.

const LIBRARY_EMAIL = 'library@adonic.app';

export type ImportedStory = {
  source: { provider: string; id: string };
  title: string;
  synopsis: string;
  genres: GenreSlug[];
  tags: string[];
  language: 'en' | 'hi';
  contentRating: ContentRating;
  book: ParsedBook;
};

/** The official "adonic" account that owns the imported channels. Nobody can log in to it. */
export async function ensureLibraryAccount() {
  const existing = await UserModel.findOne({ email: LIBRARY_EMAIL });
  if (existing) return existing;
  const username = (await UserModel.exists({ username: 'adonic' })) ? 'adonic_library' : 'adonic';
  return UserModel.create({
    username,
    email: LIBRARY_EMAIL,
    displayName: 'adonic',
    bio: 'The official adonic library of public-domain classics.',
    passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
    emailVerifiedAt: new Date(),
  });
}

async function uniqueHandle(wanted: string) {
  let base = wanted
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 26);
  if (base.length < 3 || RESERVED_NAMES.has(base)) base = `author_${hashOf(wanted).toString(36)}`.slice(0, 26);
  for (let n = 1; ; n += 1) {
    const handle = n === 1 ? base : `${base}_${n}`;
    if (!(await ChannelModel.exists({ handle }))) return handle;
  }
}

export async function uploadArtwork(art: Artwork, folder: 'posters' | 'channel-avatars'): Promise<StoredImage> {
  return imageStorage().save({ bytes: art.bytes, extension: 'jpg', contentType: 'image/jpeg', width: art.width, height: art.height }, folder);
}

/** The channel for an author, created on first use (owned by the library account). */
export async function ensureAuthorChannel(
  owner: Types.ObjectId,
  author: { name: string; handle?: string; description: string },
  avatar: () => Promise<Artwork>,
) {
  const existing = await ChannelModel.findOne({ owner, name: author.name }).lean<IChannel>();
  if (existing) return existing;
  const image = await uploadArtwork(await avatar(), 'channel-avatars');
  const channel = await ChannelModel.create({
    owner,
    handle: await uniqueHandle(author.handle ?? author.name),
    name: author.name.slice(0, 60),
    description: author.description.slice(0, 1000),
    avatar: image,
  });
  return channel.toObject() as IChannel;
}

export async function importedSources() {
  const stories = await StoryModel.find({ 'source.provider': { $exists: true } })
    .select('source genres language title channel')
    .populate<{ channel: { name: string } | null }>('channel', 'name')
    .lean();
  return {
    keys: new Set(
      stories.flatMap((story) => [
        `${story.source!.provider}:${story.source!.id}`,
        editionKey(story.title, story.channel?.name ?? ''),
      ]),
    ),
    stories,
  };
}

/**
 * Gutenberg often has several editions of one book under different ids. Stories with the
 * same title by the same author count as one ("The Strange Case of Dr. Jekyll and Mr. Hyde").
 */
export function editionKey(title: string, author: string) {
  const plain = (text: string) =>
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // Latin accents: "Arsène" = "Arsene"
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
      .replace(/^(the|a|an) /, '')
      .trim();
  return `edition:${plain(title)}|${plain(author).slice(0, 40)}`;
}

/** Saves one story with its seasons and episodes, published, in a single transaction. */
export async function saveStory(story: ImportedStory, channel: IChannel, poster: StoredImage) {
  const day = 24 * 60 * 60 * 1000;
  // Spread "published" dates over the last ~5 months so New / Updated shelves look natural.
  const publishedAt = new Date(Date.now() - (hashOf(story.source.id) % 150) * day - day);
  try {
    await withTransaction(async (session) => {
      const [created] = await StoryModel.create(
        [{
          channel: channel._id,
          author: channel.owner,
          title: story.title,
          slug: slugify(story.title),
          synopsis: story.synopsis,
          poster,
          type: story.book.kind,
          genres: story.genres,
          tags: story.tags,
          language: story.language,
          contentRating: story.contentRating,
          status: 'published',
          progress: 'completed',
          publishedAt,
          source: story.source,
        }],
        { session },
      );

      const episodes: Record<string, unknown>[] = [];
      const addEpisode = (title: string, html: string, season: Types.ObjectId | null, order: number) => {
        const content = sanitizeStoryHtml(html);
        episodes.push({
          story: created._id,
          season,
          title: title.slice(0, 150) || story.title,
          content,
          ...measureText(content),
          order,
          status: 'published',
          publishedAt: new Date(publishedAt.getTime() + episodes.length * 60_000),
        });
      };

      if (story.book.kind === 'single') {
        addEpisode(story.title, story.book.html, null, 1);
      } else {
        const seasons = await SeasonModel.insertMany(
          story.book.seasons.map((season, index) => ({ story: created._id, title: season.title, order: index + 1 })),
          { session },
        );
        story.book.seasons.forEach((season, s) =>
          season.episodes.forEach((episode, e) => addEpisode(episode.title, episode.html, seasons[s]._id, e + 1)),
        );
      }
      await EpisodeModel.insertMany(episodes, { session });
      await ChannelModel.updateOne({ _id: channel._id }, { $inc: { 'stats.stories': 1 } }, { session });
      await syncStoryEpisodes(created._id, session);
    });
  } catch (error) {
    await imageStorage().remove(poster.key).catch(() => {});
    throw error;
  }
}

/**
 * Data + index size of every database in the cluster, in MB (what the free tier counts).
 * Falls back to this app's database alone if the user may not list databases.
 */
export async function clusterSizeMb() {
  const client = mongoose.connection.getClient();
  let names = [mongoose.connection.db!.databaseName];
  try {
    const { databases } = await mongoose.connection.db!.admin().listDatabases();
    names = databases.map((database) => database.name).filter((name) => !['admin', 'local', 'config'].includes(name));
  } catch {
    // no permission to list databases
  }
  let bytes = 0;
  for (const name of names) {
    const stats = await client.db(name).stats();
    bytes += (stats.dataSize ?? 0) + (stats.indexSize ?? 0);
  }
  return bytes / (1024 * 1024);
}
