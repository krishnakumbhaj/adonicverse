import { ok, route, unauthorized } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import UserModel from '@/models/User';
import { sendVerificationEmail } from '@/server/accounts';

export const POST = route(async () => {
  const sessionUser = await requireUser();
  await enforceRateLimit(`verify-email:${sessionUser.id}`, 3, 60 * 60);

  const user = await UserModel.findById(sessionUser.id).select('email emailVerifiedAt').lean();
  if (!user) throw unauthorized();
  if (user.emailVerifiedAt) return ok({ alreadyVerified: true });

  await sendVerificationEmail(user);
  return ok({ sent: true });
});
