export const siteConfig = {
  name: 'adonic',
  description: 'Read and write stories: series season by season, and short stories in one sitting.',
};

/** Absolute URL for links that leave the app, such as the ones in emails. */
export function appUrl(path = '/') {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return new URL(path, base).toString();
}
