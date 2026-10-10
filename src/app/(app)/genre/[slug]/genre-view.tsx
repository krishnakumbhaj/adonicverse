'use client';

import { useState } from 'react';
import type { GenreSlug } from '@/config/content';
import { MobileBackButton } from '@/components/app/app-shell';
import { GENRE_ART, genreName } from '@/components/app/genre-art';
import { PagedStoryGrid } from '@/components/app/paged-grid';
import { Chip, ChipRow } from '@/components/app/primitives';
import { query } from '@/lib/client/api';

const SORTS = [
  { id: 'popular', label: 'Popular' },
  { id: 'updated', label: 'Fresh episodes' },
  { id: 'top-rated', label: 'Top rated' },
  { id: 'new', label: 'New' },
] as const;

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'single', label: 'Short stories' },
] as const;

export default function GenreView({ slug }: { slug: GenreSlug }) {
  const { color } = GENRE_ART[slug];
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('popular');
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('all');
  const fade = `color-mix(in srgb, ${color} 35%, var(--p-surface))`;

  return (
    <div className="pb-10">
      <header
        style={{ background: `linear-gradient(${color}, ${fade})` }}
        className="px-4 pb-6 pt-[max(env(safe-area-inset-top),16px)] md:px-6 md:pb-8 md:pt-24"
      >
        <MobileBackButton fallback="/search" />
        <p className="mt-10 text-sm font-semibold md:mt-0">Genre</p>
        <h1 className="mt-1 break-words text-5xl font-black tracking-tight md:text-[clamp(48px,7vw,96px)] md:leading-none">
          {genreName(slug)}
        </h1>
      </header>
      <div style={{ background: `linear-gradient(${fade}, var(--p-surface) 220px)` }} className="pt-4">
        <div className="flex flex-col gap-3 px-4 pb-4 md:flex-row md:items-center md:justify-between md:px-6">
          <ChipRow>
            {SORTS.map((item) => (
              <Chip key={item.id} selected={sort === item.id} onClick={() => setSort(item.id)}>
                {item.label}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow>
            {TYPES.map((item) => (
              <Chip key={item.id} selected={type === item.id} onClick={() => setType(item.id)}>
                {item.label}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <PagedStoryGrid path={`/api/stories${query({ genre: slug, sort, type: type === 'all' ? undefined : type, includeMature: true })}`} />
      </div>
    </div>
  );
}
