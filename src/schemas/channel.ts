import { z } from 'zod';
import { paginationSchema, searchTermSchema, urlNameSchema } from './common';

export const handleSchema = urlNameSchema('Handle', 30);

const channelNameSchema = z.string().trim().min(1, 'Channel name is required.').max(60);
const channelDescriptionSchema = z.string().trim().max(1000);

export const createChannelSchema = z.object({
  handle: handleSchema,
  name: channelNameSchema,
  description: channelDescriptionSchema.default(''),
});

export const updateChannelSchema = z.object({
  handle: handleSchema.optional(),
  name: channelNameSchema.optional(),
  description: channelDescriptionSchema.optional(),
});

export const listChannelsQuery = paginationSchema.extend({
  q: searchTermSchema.optional(),
  sort: z.enum(['popular', 'new']).default('popular'),
});
