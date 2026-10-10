import { clientIp, ok, readJson, route } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { codeError, issueAuthToken, redeemCode } from '@/lib/tokens';
import UserModel from '@/models/User';
import { emailCodeSchema } from '@/schemas/auth';

/** Checks the emailed code and returns a one-hour `token` for `POST /api/auth/reset-password`. */
export const POST = route(async (request) => {
  await enforceRateLimit(`forgot-password-verify:${clientIp(request.headers)}`, 30, 60 * 60);
  const { email, code } = await readJson(request, emailCodeSchema);

  const user = await UserModel.findOne({ email }).select('_id').lean();
  if (!user) throw codeError('expired'); // the same answer as an account without a code
  await redeemCode(user._id, 'reset-password-code', code);
  return ok({ token: await issueAuthToken(user._id, 'reset-password') });
});
