import { z } from 'zod';
import {
  CONTENT_RATINGS,
  GENRE_SLUGS,
  LIMITS,
  STORY_PROGRESS,
  STORY_TYPES,
} from '@/config/content';
import { objectIdSchema, paginationSchema, queryFlag, searchTermSchema } from './common';

/** "#Slow Burn " → "slow-burn". Keeps letters and digits from any script. */
export function normalizeTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const unique = <T>(values: T[]) => [...new Set(values)];

export const tagSchema = z.string().transform(normalizeTag).pipe(z.string().min(1, 'Invalid tag.').max(30));

const tagsSchema = z
  .array(tagSchema)
  .max(LIMITS.tagsPerStory, `Use at most ${LIMITS.tagsPerStory} tags.`)
  .transform(unique);

const genresSchema = z
  .array(z.enum(GENRE_SLUGS))
  .min(1, 'Pick at least one genre.')
  .max(LIMITS.genresPerStory, `Pick at most ${LIMITS.genresPerStory} genres.`)
  .transform(unique);

export const languageSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2}$/, 'Use a two-letter language code such as "en" or "hi".');

export const titleSchema = z.string().trim().min(1, 'Title is required.').max(150);

/** Episode body as HTML. It is sanitized on the server before it is stored. */
export const contentSchema = z
  .string()
  .max(LIMITS.episodeContentChars, `Content must be at most ${LIMITS.episodeContentChars} characters.`);

const synopsisSchema = z.string().trim().max(2000);

export const createStorySchema = z.object({
  channelId: objectIdSchema,
  type: z.enum(STORY_TYPES),
  title: titleSchema,
  synopsis: synopsisSchema.default(''),
  genres: genresSchema,
  tags: tagsSchema.default([]),
  language: languageSchema.default('en'),
  contentRating: z.enum(CONTENT_RATINGS).default('general'),
  /** Only for `single` stories: the text of the story. */
  content: contentSchema.optional(),
});

export const updateStorySchema = z.object({
  title: titleSchema.optional(),
  synopsis: synopsisSchema.optional(),
  genres: genresSchema.optional(),
  tags: tagsSchema.optional(),
  language: languageSchema.optional(),
  contentRating: z.enum(CONTENT_RATINGS).optional(),
  /** Only for series. */
  progress: z.enum(STORY_PROGRESS).optional(),
});

export const STORY_SORTS = ['relevance', 'updated', 'new', 'popular', 'most-liked', 'top-rated'] as const;

export const listStoriesQuery = paginationSchema.extend({
  q: searchTermSchema.optional(),
  genre: z.enum(GENRE_SLUGS).optional(),
  tag: tagSchema.optional(),
  type: z.enum(STORY_TYPES).optional(),
  language: languageSchema.optional(),
  contentRating: z.enum(CONTENT_RATINGS).optional(),
  progress: z.enum(STORY_PROGRESS).optional(),
  /** Mature stories are left out of discovery unless this is `true` or `contentRating=mature`. */
  includeMature: queryFlag.default('false'),
  sort: z.enum(STORY_SORTS).optional(),
});

export const channelStoriesQuery = paginationSchema.extend({
  /** Only the channel owner can see drafts. */
  status: z.enum(['published', 'draft', 'all']).default('published'),
  sort: z.enum(['updated', 'new', 'popular']).default('updated'),
});

export const progressSchema = z.object({
  episodeId: objectIdSchema,
  position: z.number().min(0).max(1).default(0),
});
