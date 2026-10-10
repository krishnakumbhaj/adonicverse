import { badRequest, ok, readJson, route } from '@/lib/api';
import { consumeAuthToken } from '@/lib/tokens';
import UserModel from '@/models/User';
import { tokenSchema } from '@/schemas/auth';

/** Confirms an email address with the token from the verification email. */
export const POST = route(async (request) => {
  const { token } = await readJson(request, tokenSchema);
  const userId = await consumeAuthToken(token, 'verify-email');
  if (!userId) throw badRequest('This verification link is invalid or has expired.');

  await UserModel.updateOne({ _id: userId, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
  return ok({ verified: true });
});
