'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Library, Plus, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { storyKind } from '@/lib/client/format';
import { useApi, useCurrentUser } from '@/lib/client/hooks';
import type { Channel, HistoryItem, LibraryItem, Page, Story, SubscriptionItem } from '@/lib/client/types';
import { Avatar, Poster } from './poster';
import { Chip, ChipRow, cx, PillLink } from './primitives';

export type LibraryFilter = 'stories' | 'reading' | 'channels';

export const LIBRARY_FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: 'stories', label: 'Stories' },
  { id: 'reading', label: 'Reading' },
  { id: 'channels', label: 'Channels' },
];

export type LibraryRow = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  date: string;
  story?: Story;
  channel?: Channel;
};

/** Saved stories, subscribed channels and stories in progress, merged like Spotify's library. */
export function useLibraryRows(filter: LibraryFilter | null) {
  const library = useApi<Page<LibraryItem>>('/api/me/library?limit=50');
  const subscriptions = useApi<Page<SubscriptionItem>>('/api/me/subscriptions?limit=50');
  const history = useApi<Page<HistoryItem>>(filter === 'reading' ? '/api/me/history?limit=50' : null);

  const stories: LibraryRow[] = (library.data?.items ?? []).map(({ story, savedAt }) => ({
    key: `story-${story.id}`,
    href: `/story/${story.id}`,
    title: story.title,
    subtitle: `${storyKind(story.type)} · ${story.channel?.name ?? ''}`,
    date: savedAt,
    story,
  }));
  const channels: LibraryRow[] = (subscriptions.data?.items ?? []).map(({ channel, subscribedAt }) => ({
    key: `channel-${channel.id}`,
    href: `/channel/${channel.handle}`,
    title: channel.name,
    subtitle: 'Channel',
    date: subscribedAt,
    channel,
  }));
  const reading: LibraryRow[] = (history.data?.items ?? []).map(({ story, episode, updatedAt }) => ({
    key: `reading-${story.id}`,
    href: episode ? `/read/${episode.id}` : `/story/${story.id}`,
    title: story.title,
    subtitle: episode ? `Continue: ${episode.title}` : storyKind(story.type),
    date: updatedAt,
    story,
  }));

  const rows =
    filter === 'stories'
      ? stories
      : filter === 'channels'
        ? channels
        : filter === 'reading'
          ? reading
          : [...stories, ...channels].sort((a, b) => b.date.localeCompare(a.date));
  const loading = library.isLoading || subscriptions.isLoading || (filter === 'reading' && history.isLoading);
  return { rows, loading };
}

/** Cover art for a library row: square poster, or a round avatar for channels. */
export function LibraryRowArt({ row, className }: { row: LibraryRow; className: string }) {
  if (row.channel) {
    return <Avatar name={row.channel.name} image={row.channel.avatar} seed={row.channel.id} sizes="64px" className={className} />;
  }
  return row.story ? <Poster story={row.story} showTitle={false} sizes="64px" className={cx('rounded', className)} /> : null;
}

export function LibraryFilterChips({
  filter,
  onChange,
  className,
}: {
  filter: LibraryFilter | null;
  onChange: (filter: LibraryFilter | null) => void;
  className?: string;
}) {
  return (
    <ChipRow className={className}>
      {filter && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={() => onChange(null)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.07] text-pal-subdued hover:bg-white/[.12] hover:text-pal-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {LIBRARY_FILTERS.filter((item) => !filter || item.id === filter).map((item) => (
        <Chip key={item.id} selected={filter === item.id} onClick={() => onChange(filter === item.id ? null : item.id)}>
          {item.label}
        </Chip>
      ))}
    </ChipRow>
  );
}

/**
 * "Your Library" panel on the left. Collapses to cover art only on tablets (md) and
 * shows titles and filters from lg up, like Spotify's library sidebar.
 */
export function LibrarySidebar() {
  const { signedIn, status } = useCurrentUser();

  return (
    <aside className="hidden min-h-0 shrink-0 flex-col rounded-lg bg-pal-surface md:flex md:w-[72px] lg:w-[300px] xl:w-[340px]">
      <div className="flex items-center justify-center px-3 pb-2 pt-3 lg:justify-between lg:px-4">
        <Link
          href="/library"
          title="Your Library"
          className="flex items-center gap-3 rounded-md p-2 font-bold text-pal-subdued transition-colors hover:text-pal-text"
        >
          <Library className="h-6 w-6" />
          <span className="hidden lg:inline">Your Library</span>
        </Link>
        {signedIn && (
          <Link
            href="/studio/new"
            aria-label="Create a story"
            title="Create a story"
            className="hidden h-8 w-8 place-items-center rounded-full text-pal-subdued transition hover:scale-105 hover:bg-pal-elevated hover:text-pal-text lg:grid"
          >
            <Plus className="h-5 w-5" />
          </Link>
        )}
      </div>
      {status === 'loading' ? null : signedIn ? <LibraryList /> : <SignedOutLibrary />}
    </aside>
  );
}

function LibraryList() {
  const pathname = usePathname();
  const [filter, setFilter] = useState<LibraryFilter | null>(null);
  const { rows, loading } = useLibraryRows(filter);

  return (
    <>
      <LibraryFilterChips filter={filter} onChange={setFilter} className="hidden px-4 pb-2 lg:flex" />
      <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {rows.map((row) => {
          const active = pathname === row.href;
          return (
            <li key={row.key}>
              <Link
                href={row.href}
                title={row.title}
                className={cx(
                  'flex items-center justify-center gap-3 rounded-md p-2 transition-colors hover:bg-white/[.07] lg:justify-start',
                  active && 'bg-white/[.1]',
                )}
              >
                <LibraryRowArt row={row} className="h-12 w-12 text-lg" />
                <span className="hidden min-w-0 lg:block">
                  <span className={cx('block truncate font-medium', active && 'text-pal-accent')}>{row.title}</span>
                  <span className="block truncate text-sm text-pal-subdued">{row.subtitle}</span>
                </span>
              </Link>
            </li>
          );
        })}
        {!loading && rows.length === 0 && (
          <li className="hidden space-y-4 px-2 py-2 lg:block">
            {filter === 'reading' ? (
              <PromoCard title="Nothing in progress" text="Stories you start reading show up here." />
            ) : (
              <>
                <PromoCard
                  title="Save your first story"
                  text="Tap + on any story to keep it here."
                  action={<PillLink href="/search" variant="white" size="sm">Browse stories</PillLink>}
                />
                <PromoCard title="Follow writers you like" text="Subscribe to a channel to get its new episodes first." />
              </>
            )}
          </li>
        )}
      </ul>
    </>
  );
}

function SignedOutLibrary() {
  return (
    <>
      <div className="hidden min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-2 lg:flex">
        <PromoCard
          title="Save stories you love"
          text="Log in to build your library and pick up exactly where you left off."
          action={<PillLink href="/sign-in" variant="white" size="sm">Log in</PillLink>}
        />
        <PromoCard
          title="Find your next favorite story"
          text="Series and short stories in every genre, free to read."
          action={<PillLink href="/search" variant="white" size="sm">Browse stories</PillLink>}
        />
      </div>
      <p className="hidden px-6 pb-6 text-[11px] text-pal-subdued lg:block">
        © {new Date().getFullYear()} {siteConfig.name}
      </p>
    </>
  );
}

export function PromoCard({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-pal-elevated px-5 py-4">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm text-pal-text">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
