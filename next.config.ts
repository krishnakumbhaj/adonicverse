import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets verification builds and the API test use their own folder (e.g. NEXT_DIST_DIR=.next-check)
  // so they never clash with a running `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Story posters, avatars and banners uploaded through Cloudinary.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
