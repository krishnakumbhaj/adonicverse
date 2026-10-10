import { clientIp, ok, readJson, route } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { emailCodeSchema } from '@/schemas/auth';
import { finishSignUp } from '@/server/accounts';
import { toAccount } from '@/server/serializers';

/** Finishes a sign-up with the emailed code: creates the account (email verified). Then sign in with `signIn()`. */
export const POST = route(async (request) => {
  await enforceRateLimit(`sign-up-verify:${clientIp(request.headers)}`, 30, 60 * 60);
  const { email, code } = await readJson(request, emailCodeSchema);
  const user = await finishSignUp(email, code);
  return ok({ user: toAccount(user.toObject()) }, 201);
});
