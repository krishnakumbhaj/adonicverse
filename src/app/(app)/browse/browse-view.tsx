'use client';

import { useState } from 'react';
import { MobileBackButton } from '@/components/app/app-shell';
import { PagedChannelGrid, PagedStoryGrid } from '@/components/app/paged-grid';
import { Chip, ChipRow } from '@/components/app/primitives';
import { query } from '@/lib/client/api';
import { browseTitle, SORT_TITLES, type BrowseParams } from './browse-title';

const TYPES = [
  { id: undefined, label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'single', label: 'Short stories' },
] as const;

export default function BrowseView({ params }: { params: BrowseParams }) {
  const [type, setType] = useState<string | undefined>(params.type === 'series' || params.type === 'single' ? params.type : undefined);
  const channels = params.kind === 'channels';
  const sort = params.sort && params.sort in SORT_TITLES ? params.sort : 'popular';

  return (
    <div className="pb-10">
      <header className="px-4 pb-4 pt-[max(env(safe-area-inset-top),16px)] md:px-6 md:pt-8">
        <MobileBackButton />
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:mt-0 md:text-4xl">{browseTitle(params)}</h1>
      </header>
      {channels ? (
        <PagedChannelGrid path="/api/channels?sort=popular" />
      ) : (
        <>
          <ChipRow className="px-4 pb-4 md:px-6">
            {TYPES.map((item) => (
              <Chip key={item.label} selected={type === item.id} onClick={() => setType(item.id)}>
                {item.label}
              </Chip>
            ))}
          </ChipRow>
          <PagedStoryGrid path={`/api/stories${query({ sort, type, tag: params.tag, includeMature: Boolean(params.tag) })}`} />
        </>
      )}
    </div>
  );
}
