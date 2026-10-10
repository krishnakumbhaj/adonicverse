import { ok, paged, pageWindow, readQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import NotificationModel from '@/models/Notification';
import { notificationsQuery } from '@/schemas/engagement';
import {
  CHANNEL_SUMMARY_FIELDS,
  STORY_SUMMARY_FIELDS,
  USER_SUMMARY_FIELDS,
  toNotification,
  type NotificationDoc,
} from '@/server/serializers';

/** Newest first. `?unread=true` returns only unread ones. `unreadCount` is for the badge. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const query = readQuery(request, notificationsQuery);
  const { skip, limit } = pageWindow(query);

  const [rows, unreadCount] = await Promise.all([
    NotificationModel.find({ recipient: user.id, ...(query.unread && { read: false }) })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', USER_SUMMARY_FIELDS)
      .populate('channel', CHANNEL_SUMMARY_FIELDS)
      .populate('story', STORY_SUMMARY_FIELDS)
      .populate('episode', 'title')
      .populate('comment', 'body')
      .lean<NotificationDoc[]>(),
    NotificationModel.countDocuments({ recipient: user.id, read: false }),
  ]);

  return ok({ ...paged(rows.map(toNotification), query), unreadCount });
});
