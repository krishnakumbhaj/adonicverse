import { conflict, ok, readJson, route, unauthorized } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import UserModel, { type IUser } from '@/models/User';
import { updateProfileSchema } from '@/schemas/auth';
import { toAccount } from '@/server/serializers';

export const GET = route(async () => {
  const sessionUser = await requireUser();
  const user = await UserModel.findById(sessionUser.id).lean<IUser>();
  if (!user) throw unauthorized();
  return ok({ user: toAccount(user) });
});

/**
 * Updates the profile. After changing `username` or `displayName`, the client should call
 * `useSession().update()` so the session picks up the new values.
 */
export const PATCH = route(async (request) => {
  const sessionUser = await requireUser();
  const input = await readJson(request, updateProfileSchema);

  if (input.username && (await UserModel.exists({ username: input.username, _id: { $ne: sessionUser.id } }))) {
    throw conflict('That username is taken.', { username: ['This username is taken.'] });
  }

  const user = await UserModel.findByIdAndUpdate(sessionUser.id, { $set: input }, { new: true }).lean<IUser>();
  if (!user) throw unauthorized();
  return ok({ user: toAccount(user) });
});
