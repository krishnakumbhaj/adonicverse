'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpDown, Plus } from 'lucide-react';
import { MobileHeader } from '@/components/app/app-shell';
import {
  LibraryFilterChips,
  LibraryRowArt,
  useLibraryRows,
  type LibraryFilter,
} from '@/components/app/library-sidebar';
import { EmptyState, PillLink, Spinner } from '@/components/app/primitives';

/** Your Library as a full page: the main way in on phones, Spotify's third tab. */
export default function LibraryView() {
  const [filter, setFilter] = useState<LibraryFilter | null>(null);
  const { rows, loading } = useLibraryRows(filter);

  return (
    <div className="pb-10">
      <MobileHeader title="Your Library">
        <Link href="/studio/new" aria-label="Create a story" className="grid h-8 w-8 place-items-center">
          <Plus className="h-7 w-7" />
        </Link>
      </MobileHeader>
      <h1 className="hidden px-6 pt-8 text-3xl font-bold tracking-tight md:block">Your Library</h1>

      <LibraryFilterChips filter={filter} onChange={setFilter} className="px-4 py-3 md:px-6" />
      <p className="flex items-center gap-2 px-4 pb-2 text-sm font-semibold md:px-6">
        <ArrowUpDown className="h-4 w-4" /> Recents
      </p>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          title={filter === 'reading' ? 'Nothing in progress' : 'Your library is empty'}
          text={
            filter === 'reading'
              ? 'Stories you start reading show up here.'
              : 'Save stories and subscribe to channels, and they will live here.'
          }
          action={<PillLink href="/search" variant="white">Browse stories</PillLink>}
        />
      ) : (
        <ul className="px-2 md:px-4">
          {rows.map((row) => (
            <li key={row.key}>
              <Link href={row.href} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/[.07]">
                <LibraryRowArt row={row} className="h-16 w-16 text-2xl" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{row.title}</span>
                  <span className="block truncate text-sm text-pal-subdued">{row.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
