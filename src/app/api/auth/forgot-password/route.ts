import { clientIp, ok, readJson, route, tooManyRequests } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { CODE_LIFETIME_MINUTES } from '@/lib/tokens';
import UserModel from '@/models/User';
import { forgotPasswordSchema } from '@/schemas/auth';
import { sendPasswordResetCode } from '@/server/accounts';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Emails a 6-digit code for choosing a new password. An account can reset its password this way
 * once a day. Unknown emails get the same answer, so this can't be used to look for accounts.
 */
export const POST = route(async (request) => {
  await enforceRateLimit(`forgot-password:ip:${clientIp(request.headers)}`, 10, 60 * 60);
  const { email } = await readJson(request, forgotPasswordSchema);

  const user = await UserModel.findOne({ email }).select('email passwordResetAt').lean();
  const allowedAt = user?.passwordResetAt ? user.passwordResetAt.getTime() + DAY_MS : 0;
  if (allowedAt > Date.now()) {
    const hours = Math.ceil((allowedAt - Date.now()) / (60 * 60 * 1000));
    throw tooManyRequests(
      `You can reset your password once a day, and you already did today. Try again in ${hours === 1 ? 'an hour' : `${hours} hours`}.`,
    );
  }
  await enforceRateLimit(`forgot-password:resend:${email}`, 1, 60, 'Wait a minute before asking for another code.');
  await enforceRateLimit(`forgot-password:day:${email}`, 3, 24 * 60 * 60, "You've asked for 3 codes today. Try again tomorrow.");

  if (user) await sendPasswordResetCode(user);
  return ok({
    message: 'If an account uses that email, a code is on its way.',
    expiresInMinutes: CODE_LIFETIME_MINUTES,
    resendAfterSeconds: 60,
  });
});
