import { withAuth } from 'next-auth/middleware';

// Pages that need an account. Visitors are sent to /sign-in and brought back afterwards.
// (API routes check the session themselves.)
export default withAuth({ pages: { signIn: '/sign-in' } });

export const config = {
  matcher: ['/library', '/notifications', '/settings', '/studio/:path*'],
};
