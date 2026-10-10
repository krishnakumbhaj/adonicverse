import type { DefaultSession } from 'next-auth';

type UserRole = 'user' | 'admin';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    username: string;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
  }
}
