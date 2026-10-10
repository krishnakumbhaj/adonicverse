import bcrypt from 'bcryptjs';
import { badRequest, ok, readJson, route, unauthorized } from '@/lib/api';
import { PASSWORD_HASH_ROUNDS, requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import UserModel from '@/models/User';
import { changePasswordSchema } from '@/schemas/auth';

export const POST = route(async (request) => {
  const sessionUser = await requireUser();
  await enforceRateLimit(`change-password:${sessionUser.id}`, 10, 60 * 60);
  const { currentPassword, newPassword } = await readJson(request, changePasswordSchema);

  const user = await UserModel.findById(sessionUser.id).select('+passwordHash');
  if (!user) throw unauthorized();
  if (!user.passwordHash) {
    throw badRequest('Your account signs in with Google and has no password yet. To add one, use "Forgot your password?" on the log-in page.', {
      currentPassword: ['This account has no password yet.'],
    });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest('Your current password is incorrect.', { currentPassword: ['Incorrect password.'] });
  }

  user.passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
  await user.save();
  return ok({ changed: true });
});
