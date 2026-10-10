import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * The web app manifest (served at /manifest.webmanifest and linked automatically), so adonic can
 * be installed to the home screen or desktop and opens full screen in its dark theme.
 * Icons are in public/icons: the mark on black, plus a padded "maskable" one Android can crop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['books', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the app icon for these.
    shortcuts: [
      { name: 'Search', url: '/search', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Your Library', short_name: 'Library', url: '/library', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Create in Studio', short_name: 'Create', url: '/studio', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}
