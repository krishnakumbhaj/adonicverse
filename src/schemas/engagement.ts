import { z } from 'zod';
import { objectIdSchema, paginationSchema, queryFlag } from './common';

const commentBodySchema = z.string().trim().min(1, "Comment can't be empty.").max(2000);

export const createCommentSchema = z.object({
  body: commentBodySchema,
  /** Reply to this comment. Replies to a reply are attached to its top-level comment. */
  parentId: objectIdSchema.optional(),
});

export const updateCommentSchema = z.object({ body: commentBodySchema });

export const commentsQuery = paginationSchema.extend({
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(5000).default(''),
});

export const notificationsQuery = paginationSchema.extend({
  unread: queryFlag.optional(),
});

export const markNotificationsReadSchema = z.object({
  /** Leave out to mark every notification as read. */
  ids: z.array(objectIdSchema).max(100).optional(),
});
