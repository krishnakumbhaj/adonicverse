import bcrypt from 'bcryptjs';
import { clientIp, ok, readJson, route } from '@/lib/api';
import { PASSWORD_HASH_ROUNDS } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { CODE_LIFETIME_MINUTES } from '@/lib/tokens';
import { signUpSchema } from '@/schemas/auth';
import { assertAccountAvailable, startSignUp } from '@/server/accounts';

/**
 * Starts a sign-up: checks the details and emails a 6-digit code. The account is created by
 * `POST /api/auth/sign-up/verify` once the code is entered. Posting again sends a new code.
 */
export const POST = route(async (request) => {
  await enforceRateLimit(`sign-up:${clientIp(request.headers)}`, 10, 60 * 60);
  const input = await readJson(request, signUpSchema);
  await assertAccountAvailable(input);
  await enforceRateLimit(`sign-up:resend:${input.email}`, 1, 60, 'Wait a minute before asking for another code.');
  await enforceRateLimit(`sign-up:email:${input.email}`, 5, 60 * 60, 'Too many codes for this email. Try again in an hour.');

  await startSignUp({ ...input, passwordHash: await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS) });
  return ok({ email: input.email, expiresInMinutes: CODE_LIFETIME_MINUTES, resendAfterSeconds: 60 });
});
