'use client';

import { useState } from 'react';
import { MobileHeader } from '@/components/app/app-shell';
import { QuickTile } from '@/components/app/cards';
import { useMainScrollTop } from '@/components/app/main-scroll';
import { Chip, ChipRow, cx, EmptyState, PillLink } from '@/components/app/primitives';
import { ChannelShelf, StoryShelf } from '@/components/app/shelves';
import { query } from '@/lib/client/api';
import { useApi, useCurrentUser } from '@/lib/client/hooks';
import type { HistoryItem, Page, Story } from '@/lib/client/types';

type Filter = 'all' | 'series' | 'single';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'single', label: 'Short stories' },
];

const GENRE_SHELVES = [
  { slug: 'romance', title: 'Romance' },
  { slug: 'fantasy', title: 'Fantasy worlds' },
  { slug: 'mystery', title: 'Mysteries to solve' },
  { slug: 'horror', title: 'Read with the lights on' },
];

/** Spotify's Home: filter chips, a grid of recent items, then shelves. */
export default function HomeView() {
  const { signedIn } = useCurrentUser();
  const [filter, setFilter] = useState<Filter>('all');
  const scrolled = useMainScrollTop() > 0;
  const type = filter === 'all' ? undefined : filter;

  const history = useApi<Page<HistoryItem>>(signedIn ? '/api/me/history?limit=8' : null);
  const popular = useApi<Page<Story>>(`/api/stories${query({ sort: 'popular', limit: 12, type })}`);
  const recents = history.data?.items ?? [];
  const nothingPublished = popular.data?.items.length === 0 && filter === 'all';

  const chips = (
    <ChipRow>
      {FILTERS.map((item) => (
        <Chip key={item.id} selected={filter === item.id} onClick={() => setFilter(item.id)}>
          {item.label}
        </Chip>
      ))}
    </ChipRow>
  );

  return (
    <div className="relative">
      {/* Spotify's soft color wash behind the top of Home. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[332px]"
        style={{ background: 'linear-gradient(color-mix(in srgb, var(--p-hero) 70%, transparent), transparent)' }}
      />

      <div className="relative">
        <MobileHeader>{chips}</MobileHeader>
        <div
          className={cx(
            'sticky top-0 z-10 hidden px-6 py-3 transition-colors duration-300 md:block',
            scrolled ? 'bg-pal-surface' : 'bg-transparent',
          )}
        >
          {chips}
        </div>

        {recents.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 px-4 md:px-6 xl:grid-cols-4">
            {recents.map((item) => (
              <QuickTile
                key={item.story.id}
                href={item.episode ? `/read/${item.episode.id}` : `/story/${item.story.id}`}
                story={item.story}
                label={item.episode?.title}
              />
            ))}
          </div>
        )}

        {nothingPublished ? (
          <EmptyState
            title="No stories yet"
            text="Be the first to publish. Create a channel, write a story, and it will appear here."
            action={<PillLink href="/studio">Start writing</PillLink>}
          />
        ) : (
          <div className="pb-10">
            {signedIn && filter === 'all' && <StoryShelf title="New from your subscriptions" path="/api/me/feed?limit=12" />}
            <StoryShelf
              title="Popular right now"
              path={`/api/stories${query({ sort: 'popular', limit: 12, type })}`}
              href={`/browse${query({ sort: 'popular', type })}`}
            />
            <StoryShelf
              title="Fresh episodes"
              path={`/api/stories${query({ sort: 'updated', limit: 12, type })}`}
              href={`/browse${query({ sort: 'updated', type })}`}
            />
            {filter === 'all' && <ChannelShelf title="Popular channels" path="/api/channels?sort=popular&limit=12" href="/browse?kind=channels" />}
            <StoryShelf
              title="Top rated"
              path={`/api/stories${query({ sort: 'top-rated', limit: 12, type })}`}
              href={`/browse${query({ sort: 'top-rated', type })}`}
            />
            {GENRE_SHELVES.map((genre) => (
              <StoryShelf
                key={genre.slug}
                title={genre.title}
                path={`/api/stories${query({ genre: genre.slug, sort: 'popular', limit: 12, type })}`}
                href={`/genre/${genre.slug}`}
              />
            ))}
            <StoryShelf
              title="New on the shelf"
              path={`/api/stories${query({ sort: 'new', limit: 12, type })}`}
              href={`/browse${query({ sort: 'new', type })}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
