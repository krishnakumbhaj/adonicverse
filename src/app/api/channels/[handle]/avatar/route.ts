import { channelImageRoutes } from '@/server/channel-images';

const handlers = channelImageRoutes('avatar', 'channel-avatars');

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
