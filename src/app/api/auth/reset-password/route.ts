import bcrypt from 'bcryptjs';
import { badRequest, ok, readJson, route } from '@/lib/api';
import { PASSWORD_HASH_ROUNDS } from '@/lib/auth';
import { consumeAuthToken } from '@/lib/tokens';
import UserModel from '@/models/User';
import { resetPasswordSchema } from '@/schemas/auth';

export const POST = route(async (request) => {
  const { token, password } = await readJson(request, resetPasswordSchema);
  const userId = await consumeAuthToken(token, 'reset-password');
  if (!userId) throw badRequest('This reset link is invalid or has expired.');

  const user = await UserModel.findById(userId);
  if (!user) throw badRequest('This reset link is invalid or has expired.');

  user.passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  // The emailed code (or link) proves the user owns the address.
  user.emailVerifiedAt ??= new Date();
  // "Forgot password" works once a day; see /api/auth/forgot-password.
  user.passwordResetAt = new Date();
  await user.save();

  return ok({ reset: true });
});
