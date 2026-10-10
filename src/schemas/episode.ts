import { z } from 'zod';
import { objectIdSchema } from './common';
import { contentSchema, titleSchema } from './story';

const seasonTitleSchema = z.string().trim().max(100);
const seasonSynopsisSchema = z.string().trim().max(1000);

export const createSeasonSchema = z.object({
  title: seasonTitleSchema.default(''),
  synopsis: seasonSynopsisSchema.default(''),
});

export const updateSeasonSchema = z.object({
  title: seasonTitleSchema.optional(),
  synopsis: seasonSynopsisSchema.optional(),
});

/** New order for every season of a story, or every episode of a season. */
export const reorderSchema = z.object({
  order: z
    .array(objectIdSchema)
    .min(1)
    .max(2000)
    .refine((ids) => new Set(ids).size === ids.length, 'Ids must not repeat.'),
});

export const createEpisodeSchema = z.object({
  seasonId: objectIdSchema,
  title: titleSchema,
  content: contentSchema.default(''),
});

export const updateEpisodeSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  /** Moves the episode to the end of another season of the same story. */
  seasonId: objectIdSchema.optional(),
});
