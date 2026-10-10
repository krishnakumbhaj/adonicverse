import bcrypt from 'bcryptjs';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google';
import UserModel, { type IUser } from '@/models/User';
import { signInSchema } from '@/schemas/auth';
import { findOrCreateGoogleUser } from '@/server/accounts';
import { clientIp, unauthorized } from './api';
import { dbConnect } from './db';
import { consumeRateLimit } from './rate-limit';

export const PASSWORD_HASH_ROUNDS = 12;

/** "Continue with Google" is offered when its keys are set in the environment. */
export const googleSignInEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// One message for every failure so sign-in doesn't reveal which accounts exist.
const INVALID_CREDENTIALS = 'Invalid email/username or password.';

/** Session token fields that come from the account. */
function accountClaims(user: IUser): Partial<JWT> {
  return {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
    email: user.email,
    name: user.displayName,
    picture: user.avatar?.url ?? null,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email or username',
      credentials: {
        identifier: { label: 'Email or username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) throw new Error(INVALID_CREDENTIALS);
        const identifier = parsed.data.identifier.toLowerCase();

        await dbConnect();
        const ip = clientIp(request?.headers);
        const allowed =
          (await consumeRateLimit(`sign-in:ip:${ip}`, 50, 15 * 60)) &&
          (await consumeRateLimit(`sign-in:account:${ip}:${identifier}`, 10, 15 * 60));
        if (!allowed) throw new Error('Too many sign-in attempts. Try again in a few minutes.');

        const user = await UserModel.findOne({ $or: [{ email: identifier }, { username: identifier }] })
          .select('+passwordHash')
          .lean();
        // Accounts made with Google have no password until the owner sets one.
        if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
          throw new Error(INVALID_CREDENTIALS);
        }

        return {
          id: user._id.toString(),
          username: user.username,
          role: user.role,
          email: user.email,
          name: user.displayName,
          image: user.avatar?.url ?? null,
        };
      },
    }),
    ...(googleSignInEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // Let people pick which Google account to use, like Spotify does.
            authorization: { params: { prompt: 'select_account' } },
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;
      // Accounts are matched by email, so only trust addresses Google has verified.
      const google = profile as GoogleProfile | undefined;
      if (!google?.email || !google.email_verified) return false;
      await dbConnect();
      await findOrCreateGoogleUser(google);
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (account?.provider === 'google') {
        // `user` is the Google profile here, so load our own account instead.
        await dbConnect();
        const own = await UserModel.findOne({ googleId: account.providerAccountId }).lean();
        if (!own) throw new Error('This Google account is not linked to an account.');
        Object.assign(token, accountClaims(own));
      } else if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      // The client calls `useSession().update()` after editing the profile to refresh these.
      if (trigger === 'update' && token.id) {
        await dbConnect();
        const fresh = await UserModel.findById(token.id).lean();
        if (fresh) Object.assign(token, accountClaims(fresh));
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.role = token.role;
      return session;
    },
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  // Sign-in errors (such as a cancelled Google sign-in) come back to the log-in page as `?error=`.
  pages: { signIn: '/sign-in', error: '/sign-in' },
};

export type SessionUser = { id: string; username: string; role: 'user' | 'admin' };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const { id, username, role } = session.user;
  return { id, username, role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export const isAdmin = (user: SessionUser | null) => user?.role === 'admin';
