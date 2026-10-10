import { z } from 'zod';
import { LIMITS, RESERVED_NAMES } from '@/config/content';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.maxPageSize).default(LIMITS.pageSize),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** `"true"` / `"false"` query flag. (`z.coerce.boolean` would treat `"false"` as true.) */
export const queryFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

export const searchTermSchema = z.string().trim().min(1).max(100);

/** Lowercase name used in URLs: usernames and channel handles. */
export function urlNameSchema(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(3, `${label} must be at least 3 characters.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .regex(/^[a-z0-9_]+$/, 'Use only letters, numbers, and underscores.')
    .refine((value) => !RESERVED_NAMES.has(value), `This ${label.toLowerCase()} is reserved.`);
}
