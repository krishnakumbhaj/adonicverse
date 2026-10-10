import type { FilterQuery, SortOrder } from 'mongoose';
import { badRequest, forbidden, notFound, ok, paged, pageWindow, readJson, readQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { measureText, sanitizeStoryHtml } from '@/lib/content';
import { withTransaction } from '@/lib/db';
import { slugify } from '@/lib/slug';
import ChannelModel, { type IChannel } from '@/models/Channel';
import EpisodeModel from '@/models/Episode';
import SeasonModel from '@/models/Season';
import StoryModel, { type IStory } from '@/models/Story';
import { createStorySchema, listStoriesQuery } from '@/schemas/story';
import { canManageChannel } from '@/server/access';
import { toStory, type StoryDoc } from '@/server/serializers';
import { loadStory, storyChannelPopulate } from '@/server/stories';

type Sort = Record<string, SortOrder | { $meta: 'textScore' }>;

const SORTS: Record<'updated' | 'new' | 'popular' | 'most-liked' | 'top-rated', Sort> = {
  updated: { lastPublishedAt: -1 },
  new: { publishedAt: -1 },
  popular: { 'stats.views': -1 },
  'most-liked': { 'stats.likes': -1 },
  'top-rated': { 'rating.average': -1, 'rating.count': -1 },
};

/** Discover published stories: search, filter and sort. See docs/API.md for the parameters. */
export const GET = route(async (request) => {
  const query = readQuery(request, listStoriesQuery);
  const { skip, limit } = pageWindow(query);

  const filter: FilterQuery<IStory> = { status: 'published' };
  if (query.genre) filter.genres = query.genre;
  if (query.tag) filter.tags = query.tag;
  if (query.type) filter.type = query.type;
  if (query.language) filter.language = query.language;
  if (query.progress) filter.progress = query.progress;
  if (query.contentRating) filter.contentRating = query.contentRating;
  else if (!query.includeMature) filter.contentRating = { $ne: 'mature' };

  let sort: Sort;
  if (query.q) {
    await StoryModel.init(); // the text index must exist before a $text query
    filter.$text = { $search: query.q };
    sort = !query.sort || query.sort === 'relevance' ? { score: { $meta: 'textScore' } } : SORTS[query.sort];
  } else {
    sort = SORTS[!query.sort || query.sort === 'relevance' ? 'updated' : query.sort];
  }

  const stories = await StoryModel.find(filter)
    .sort({ ...sort, _id: -1 })
    .skip(skip)
    .limit(limit)
    .populate(storyChannelPopulate)
    .lean<StoryDoc[]>();

  return ok(paged(stories.map(toStory), query));
});

/**
 * Creates a draft story in one of your channels. A series starts with an empty Season 1;
 * a single story starts with its one episode, filled from `content` if given.
 */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, createStorySchema);
  if (input.type === 'series' && input.content !== undefined) {
    throw badRequest('A series has no content of its own; add episodes instead.', {
      content: ['Only single stories take content.'],
    });
  }

  const channel = await ChannelModel.findById(input.channelId).lean<IChannel>();
  if (!channel) throw notFound('Channel');
  if (!canManageChannel(channel, user)) throw forbidden('You can only add stories to your own channels.');

  const content = sanitizeStoryHtml(input.content ?? '');
  const storyId = await withTransaction(async (session) => {
    const [story] = await StoryModel.create(
      [{
        channel: channel._id,
        author: channel.owner,
        type: input.type,
        title: input.title,
        slug: slugify(input.title),
        synopsis: input.synopsis,
        genres: input.genres,
        tags: input.tags,
        language: input.language,
        contentRating: input.contentRating,
        progress: input.type === 'single' ? 'completed' : 'ongoing',
      }],
      { session },
    );

    if (input.type === 'series') {
      await SeasonModel.create([{ story: story._id, order: 1 }], { session });
    } else {
      await EpisodeModel.create(
        [{ story: story._id, season: null, title: input.title, content, ...measureText(content), order: 1 }],
        { session },
      );
    }
    return story._id;
  });

  return ok({ story: toStory(await loadStory(storyId)) }, 201);
});
