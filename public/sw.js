// adonic's service worker (registered by src/components/app/pwa.tsx in production builds).
// - Pages always come from the network, since stories and feeds are live. When there's no
//   connection, the /offline page is shown instead of the browser's error.
// - Build files (/_next/static) have a content hash in their names, so they're kept in a
//   cache and served from it, which makes the installed app open faster.
// - Everything else (API, images, sign-in) goes straight to the network.
// Change VERSION to drop the old caches after editing this file.

const VERSION = 'v1';
const PAGES = `adonic-pages-${VERSION}`;
const STATIC = `adonic-static-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      const response = await fetch(new Request(OFFLINE_URL, { cache: 'reload' }));
      await pages.put(OFFLINE_URL, response.clone());
      // The offline page's stylesheets and icon, so it looks right with no connection.
      const html = await response.text();
      const styles = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((match) => match[1]);
      const statics = await caches.open(STATIC);
      await statics.addAll([...new Set(styles), '/icons/icon-192.png']);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('adonic-') && !key.endsWith(VERSION)).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(request));
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
