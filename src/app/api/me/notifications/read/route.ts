import { ok, readJson, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import NotificationModel from '@/models/Notification';
import { markNotificationsReadSchema } from '@/schemas/engagement';

/** Marks the given notifications as read, or all of them when `ids` is left out. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const { ids } = await readJson(request, markNotificationsReadSchema);

  const result = await NotificationModel.updateMany(
    { recipient: user.id, read: false, ...(ids && { _id: { $in: ids } }) },
    { $set: { read: true } },
  );
  return ok({ updated: result.modifiedCount });
});
