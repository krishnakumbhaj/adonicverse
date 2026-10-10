import { ok, route } from '@/lib/api';
import UserModel from '@/models/User';
import { usernameSchema } from '@/schemas/auth';

/** `GET ?username=` — for live feedback on the sign-up form. */
export const GET = route(async (request) => {
  const parsed = usernameSchema.safeParse(request.nextUrl.searchParams.get('username') ?? '');
  if (!parsed.success) return ok({ available: false, reason: parsed.error.issues[0].message });

  const taken = await UserModel.exists({ username: parsed.data });
  return ok(taken ? { available: false, reason: 'This username is taken.' } : { available: true });
});
