'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronRight, House, Library, ListOrdered, Search, SquarePen } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useDominantColor } from '@/lib/client/colors';
import { timeAgo } from '@/lib/client/format';
import { useContinueReading, useCurrentUser } from '@/lib/client/hooks';
import type { HistoryItem } from '@/lib/client/types';
import { Poster } from './poster';
import { cx, PillLink } from './primitives';

const SIGN_UP_GRADIENT = { background: 'linear-gradient(90deg, var(--p-hero), var(--p-primary))' };

type Reading = HistoryItem & { episode: NonNullable<HistoryItem['episode']> };

/**
 * Desktop/tablet bar at the bottom, where Spotify's player sits: the story you're reading,
 * or a sign-up banner for visitors.
 */
export function BottomBar() {
  const { signedIn, status } = useCurrentUser();
  const reading = useContinueReading() as Reading | null;

  if (status === 'loading') return <div className="hidden h-[72px] shrink-0 md:block" />;

  if (!signedIn) {
    return (
      <div className="hidden shrink-0 p-2 pt-2 md:block">
        <div style={SIGN_UP_GRADIENT} className="flex items-center justify-between gap-6 rounded px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">Preview of {siteConfig.name}</p>
            <p className="truncate">Sign up to save stories, follow writers and pick up where you left off. It&apos;s free.</p>
          </div>
          <PillLink href="/sign-up" variant="white" size="lg" className="shrink-0">
            Sign up free
          </PillLink>
        </div>
      </div>
    );
  }

  return (
    <footer className="hidden h-[72px] shrink-0 items-center justify-between gap-4 px-4 md:flex">
      {reading ? (
        <>
          <div className="flex w-[30%] min-w-0 items-center gap-3">
            <Link href={`/story/${reading.story.id}`} className="shrink-0">
              <Poster story={reading.story} showTitle={false} sizes="56px" className="h-14 w-14 rounded" />
            </Link>
            <div className="min-w-0">
              <Link href={`/read/${reading.episode.id}`} className="block truncate text-sm font-semibold hover:underline">
                {reading.episode.title}
              </Link>
              <Link href={`/story/${reading.story.id}`} className="block truncate text-xs text-pal-subdued hover:text-pal-text hover:underline">
                {reading.story.title}
              </Link>
            </div>
          </div>

          <div className="flex max-w-[722px] flex-1 flex-col items-center gap-2">
            <div className="flex items-center gap-6 text-pal-subdued">
              <Link href={`/story/${reading.story.id}`} title="Episodes" aria-label="Episodes" className="hover:text-pal-text">
                <ListOrdered className="h-5 w-5" />
              </Link>
              <Link
                href={`/read/${reading.episode.id}`}
                title="Continue reading"
                aria-label="Continue reading"
                className="grid h-8 w-8 place-items-center rounded-full bg-pal-text text-pal-base transition hover:scale-105"
              >
                <BookOpen className="h-4 w-4" />
              </Link>
              <Link href="/library" title="Your Library" aria-label="Your Library" className="hover:text-pal-text">
                <Library className="h-5 w-5" />
              </Link>
            </div>
            <div className="group flex w-full items-center gap-2 text-xs tabular-nums text-pal-subdued">
              <span className="w-10 text-right">{Math.round(reading.position * 100)}%</span>
              <span className="h-1 flex-1 rounded-full bg-white/30">
                <span
                  className="block h-full rounded-full bg-pal-text transition-colors group-hover:bg-pal-primary"
                  style={{ width: `${Math.round(reading.position * 100)}%` }}
                />
              </span>
              <span className="w-10">read</span>
            </div>
          </div>

          <div className="flex w-[30%] justify-end text-xs text-pal-subdued">Last read {timeAgo(reading.updatedAt)}</div>
        </>
      ) : (
        <p className="w-full text-center text-sm text-pal-subdued">Start reading a story and it will wait for you here.</p>
      )}
    </footer>
  );
}

/** Phone navigation: Spotify's bottom tabs on a black fade, with the mini reading bar above. */
export function MobileNav() {
  const pathname = usePathname();
  const { signedIn, status } = useCurrentUser();
  const reading = useContinueReading() as Reading | null;

  const tabs = [
    { href: '/', label: 'Home', Icon: House, active: pathname === '/' },
    {
      href: '/search',
      label: 'Search',
      Icon: Search,
      active: ['/search', '/genre', '/browse'].some((path) => pathname.startsWith(path)),
    },
    { href: '/library', label: 'Your Library', Icon: Library, active: pathname.startsWith('/library') },
    { href: '/studio', label: 'Create', Icon: SquarePen, active: pathname.startsWith('/studio') },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black from-50% to-transparent pt-10 md:hidden">
      <div className="pointer-events-auto">
        {signedIn && reading && <MiniReadingBar reading={reading} />}
        {status === 'unauthenticated' && (
          <Link href="/sign-up" style={SIGN_UP_GRADIENT} className="mx-2 flex items-center justify-between gap-3 rounded-md px-4 py-2.5">
            <span className="text-sm">
              <span className="font-bold">Sign up free</span> to save stories and follow writers
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
        )}
      </div>
      <nav
        aria-label="Main"
        className="pointer-events-auto grid grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-3"
      >
        {tabs.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cx('flex flex-col items-center gap-1 text-[10px] font-medium', active ? 'text-pal-text' : 'text-pal-subdued')}
          >
            <Icon className="h-6 w-6" strokeWidth={active ? 2.6 : 2} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function MiniReadingBar({ reading }: { reading: Reading }) {
  const color = useDominantColor(reading.story.poster?.url, reading.story.id);
  const percent = Math.round(reading.position * 100);

  return (
    <Link
      href={`/read/${reading.episode.id}`}
      style={{ backgroundColor: color }}
      className="relative mx-2 flex items-center gap-2.5 overflow-hidden rounded-md p-2 pr-3 shadow-lg shadow-black/40"
    >
      <Poster story={reading.story} showTitle={false} sizes="40px" className="h-10 w-10 rounded" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{reading.episode.title}</span>
        <span className="block truncate text-[13px] text-white/70">{reading.story.title}</span>
      </span>
      <BookOpen className="h-6 w-6 shrink-0" aria-label="Continue reading" />
      <span className="absolute inset-x-2 bottom-0 h-[2px] rounded bg-white/25">
        <span className="block h-full rounded bg-white" style={{ width: `${percent}%` }} />
      </span>
    </Link>
  );
}
