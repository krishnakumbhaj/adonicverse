import { ok, paged, pageWindow, readQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import type { IChannel } from '@/models/Channel';
import SubscriptionModel, { type ISubscription } from '@/models/Subscription';
import { paginationSchema } from '@/schemas/common';
import { toChannel } from '@/server/serializers';

/** Channels the signed-in user subscribes to, newest first. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const page = readQuery(request, paginationSchema);
  const { skip, limit } = pageWindow(page);

  const rows = await SubscriptionModel.find({ user: user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('channel')
    .lean<(Omit<ISubscription, 'channel'> & { channel: IChannel | null })[]>();

  const result = paged(rows, page);
  return ok({
    ...result,
    items: result.items.flatMap((row) =>
      row.channel ? [{ channel: toChannel(row.channel), subscribedAt: row.createdAt }] : [],
    ),
  });
});
