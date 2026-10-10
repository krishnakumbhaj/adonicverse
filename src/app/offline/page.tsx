import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = { title: 'Offline' };

/**
 * Shown by the service worker (public/sw.js) when a page can't load without a connection.
 * It may be served with no scripts, so it uses plain links and the icon the worker keeps cached.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-pal-surface px-6 text-center text-pal-text">
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image needs the network */}
      <img src="/icons/icon-192.png" alt="" width={88} height={88} className="rounded-2xl" />
      <div>
        <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          <WifiOff className="h-7 w-7 text-pal-subdued" aria-hidden />
          You&apos;re offline
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-pal-subdued">
          Check your internet connection, then try again.
        </p>
      </div>
      {/* An empty href reloads the page that couldn't load. */}
      <a href="" className="rounded-full bg-pal-text px-8 py-3 font-bold text-pal-base transition hover:scale-105">
        Try again
      </a>
    </main>
  );
}
