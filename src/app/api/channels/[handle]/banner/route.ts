import { channelImageRoutes } from '@/server/channel-images';

const handlers = channelImageRoutes('banner', 'channel-banners');

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
