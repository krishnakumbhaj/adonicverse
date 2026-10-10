'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { GENRES } from '@/config/content';
import { MobileHeader } from '@/components/app/app-shell';
import { ChannelCard, ReadCircle, Shelf, ShelfItem } from '@/components/app/cards';
import { GENRE_ART } from '@/components/app/genre-art';
import { PagedChannelGrid, PagedStoryGrid } from '@/components/app/paged-grid';
import { Poster } from '@/components/app/poster';
import { Chip, ChipRow, EmptyState, Spinner } from '@/components/app/primitives';
import { storyKind } from '@/lib/client/format';
import { useApi } from '@/lib/client/hooks';
import type { Channel, Page, Story } from '@/lib/client/types';

type Tab = 'all' | 'stories' | 'channels';

export default function SearchView() {
  const q = useSearchParams().get('q')?.trim() ?? '';

  return (
    <div className="pb-10">
      <MobileHeader title="Search" />
      <MobileSearchInput initial={q} />
      {q ? <Results key={q} q={q} /> : <BrowseAll />}
    </div>
  );
}

/** On phones the search box lives on the page (the top bar is desktop-only). White, like Spotify's. */
function MobileSearchInput({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setValue((current) => (current.trim() === initial ? current : initial)), [initial]);

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="sticky top-0 z-10 bg-pal-surface px-4 pb-3 pt-1 md:hidden"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-pal-base" />
        <input
          type="search"
          value={value}
          onChange={(event) => {
            const text = event.target.value;
            setValue(text);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              router.replace(text.trim() ? `/search?q=${encodeURIComponent(text.trim())}` : '/search');
            }, 300);
          }}
          placeholder="What do you want to read?"
          aria-label="Search stories and channels"
          className="h-12 w-full rounded-md bg-pal-text pl-12 pr-4 text-base font-semibold text-pal-base outline-none placeholder:font-semibold placeholder:text-[#535353]"
        />
      </div>
    </form>
  );
}

/** Colorful genre tiles with a tilted art card, Spotify's "Browse all". */
function BrowseAll() {
  return (
    <section className="px-4 pt-2 md:px-6 md:pt-6">
      <h2 className="mb-4 text-base font-bold md:text-2xl">Browse all</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-6">
        {GENRES.map((genre) => {
          const { color, Icon } = GENRE_ART[genre.slug];
          return (
            <Link
              key={genre.slug}
              href={`/genre/${genre.slug}`}
              style={{ backgroundColor: color }}
              className="relative aspect-[1.65] overflow-hidden rounded-lg p-3 transition hover:brightness-110 md:p-4"
            >
              <span className="relative z-10 block max-w-[70%] break-words text-base font-bold leading-tight md:text-2xl">
                {genre.name}
              </span>
              <span className="absolute -bottom-[6%] -right-[8%] grid aspect-square w-[44%] rotate-[25deg] place-items-center rounded-md bg-black/20 shadow-[0_2px_4px_rgba(0,0,0,.2)]">
                <Icon className="h-1/2 w-1/2 text-white/90" strokeWidth={1.75} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Results({ q }: { q: string }) {
  const [tab, setTab] = useState<Tab>('all');
  const encoded = encodeURIComponent(q);

  return (
    <div>
      <ChipRow className="px-4 py-2 md:px-6 md:pt-4">
        {(['all', 'stories', 'channels'] as const).map((item) => (
          <Chip key={item} selected={tab === item} onClick={() => setTab(item)}>
            {item === 'all' ? 'All' : item === 'stories' ? 'Stories' : 'Channels'}
          </Chip>
        ))}
      </ChipRow>
      {tab === 'all' && <TopResults q={q} />}
      {tab === 'stories' && (
        <div className="pt-2">
          <PagedStoryGrid path={`/api/stories?q=${encoded}&includeMature=true`} empty={<NoResults q={q} />} />
        </div>
      )}
      {tab === 'channels' && (
        <div className="pt-2">
          <PagedChannelGrid path={`/api/channels?q=${encoded}`} empty={<NoResults q={q} />} />
        </div>
      )}
    </div>
  );
}

function TopResults({ q }: { q: string }) {
  const encoded = encodeURIComponent(q);
  const stories = useApi<Page<Story>>(`/api/stories?q=${encoded}&includeMature=true&limit=10`);
  const channels = useApi<Page<Channel>>(`/api/channels?q=${encoded}&limit=10`);

  if (!stories.data || !channels.data) return <Spinner />;
  const [top, ...rest] = stories.data.items;
  if (!top && channels.data.items.length === 0) return <NoResults q={q} />;

  return (
    <div>
      {top && (
        <div className="grid gap-6 px-4 pt-4 md:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section>
            <h2 className="mb-3 text-2xl font-bold tracking-tight">Top result</h2>
            <Link href={`/story/${top.id}`} className="group relative block rounded-lg bg-white/[.07] p-5 transition-colors hover:bg-white/[.12]">
              <Poster story={top} sizes="120px" className="aspect-[2/3] w-24 rounded-md shadow-[0_8px_24px_rgba(0,0,0,.5)]" />
              <p className="mt-5 line-clamp-2 text-3xl font-bold tracking-tight">{top.title}</p>
              <p className="mt-1 text-sm text-pal-subdued">
                <span className="mr-2 rounded-full bg-pal-base px-3 py-1 text-sm font-bold text-pal-text">{storyKind(top.type)}</span>
                {top.channel?.name}
              </p>
              <span aria-hidden className="absolute bottom-5 right-5 translate-y-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <ReadCircle />
              </span>
            </Link>
          </section>
          {rest.length > 0 && (
            <section>
              <h2 className="mb-3 text-2xl font-bold tracking-tight">Stories</h2>
              <ul>
                {rest.slice(0, 4).map((story) => (
                  <li key={story.id}>
                    <Link href={`/story/${story.id}`} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/10">
                      <Poster story={story} showTitle={false} sizes="48px" className="h-12 w-10 rounded" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{story.title}</span>
                        <span className="block truncate text-sm text-pal-subdued">
                          {storyKind(story.type)} · {story.channel?.name}
                        </span>
                      </span>
                      <span className="hidden text-sm text-pal-subdued sm:block">{story.stats.episodes} ep.</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      {channels.data.items.length > 0 && (
        <Shelf title="Channels">
          {channels.data.items.map((channel) => (
            <ShelfItem key={channel.id}>
              <ChannelCard channel={channel} />
            </ShelfItem>
          ))}
        </Shelf>
      )}
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <EmptyState
      title={`No results found for "${q}"`}
      text="Please make sure your words are spelled correctly, or use fewer or different keywords."
    />
  );
}
