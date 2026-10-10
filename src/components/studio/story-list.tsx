'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { LoadMore } from '@/components/app/paged-grid';
import { Poster } from '@/components/app/poster';
import { Badge, PillLink, Spinner } from '@/components/app/primitives';
import { compactNumber, plural, shortDate, storyKind } from '@/lib/client/format';
import { usePagedList } from '@/lib/client/hooks';
import type { Channel, Story } from '@/lib/client/types';

/** Every story of a channel, drafts included, as rows linking to the story manager. */
export function StudioStoryList({ channel }: { channel: Pick<Channel, 'id' | 'handle' | 'name'> }) {
  const list = usePagedList<Story>(`/api/channels/${channel.handle}/stories?status=all&sort=updated`, 20);

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="truncate text-2xl font-bold tracking-tight">Stories in {channel.name}</h2>
        <PillLink href={`/studio/new?channel=${channel.id}`} size="sm" icon={<Plus />} className="shrink-0">
          New story
        </PillLink>
      </div>
      {list.isLoading ? (
        <Spinner className="py-8" />
      ) : list.items.length === 0 ? (
        <p className="rounded-lg bg-white/[.07] p-5 text-pal-subdued">No stories yet. Start your first one.</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-lg bg-white/[.04]">
          {list.items.map((story) => (
            <li key={story.id}>
              <Link href={`/studio/story/${story.id}`} className="flex items-center gap-4 p-3 transition-colors hover:bg-white/[.06]">
                <Poster story={story} showTitle={false} sizes="48px" className="aspect-[2/3] w-12 rounded" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{story.title}</span>
                    {story.status === 'draft' ? <Badge tone="warning">Draft</Badge> : <Badge tone="primary">Published</Badge>}
                  </div>
                  <p className="truncate text-sm text-pal-subdued">
                    {storyKind(story.type)}
                    {story.type === 'series' && ` · ${plural(story.stats.episodes, 'published episode')}`}
                    {' · '}updated {shortDate(story.updatedAt)}
                  </p>
                </div>
                <div className="hidden text-right text-sm text-pal-subdued sm:block">
                  <p>{compactNumber(story.stats.views)} reads</p>
                  <p>{story.rating.count ? `★ ${story.rating.average.toFixed(1)}` : 'No ratings'}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
    </section>
  );
}
