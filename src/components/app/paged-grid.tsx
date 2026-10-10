'use client';

import { useEffect, useRef } from 'react';
import { usePagedList } from '@/lib/client/hooks';
import type { Channel, Story } from '@/lib/client/types';
import { CardGrid, ChannelCard, StoryCard } from './cards';
import { EmptyState, Spinner } from './primitives';

/** Loads the next page when it scrolls into view (infinite scroll). */
export function LoadMore({ hasMore, loading, onLoad }: { hasMore: boolean; loading: boolean; onLoad: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) onLoad();
      },
      { rootMargin: '400px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoad]);

  if (!hasMore) return null;
  return <div ref={ref}>{loading && <Spinner className="py-8" />}</div>;
}

export function PagedStoryGrid({ path, empty }: { path: string; empty?: React.ReactNode }) {
  const list = usePagedList<Story>(path);
  if (list.isLoading) return <Spinner />;
  if (list.items.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" text="Check back soon for new stories." />}</>;
  return (
    <>
      <CardGrid>
        {list.items.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </CardGrid>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
    </>
  );
}

export function PagedChannelGrid({ path, empty }: { path: string; empty?: React.ReactNode }) {
  const list = usePagedList<Channel>(path);
  if (list.isLoading) return <Spinner />;
  if (list.items.length === 0) return <>{empty ?? <EmptyState title="No channels yet" />}</>;
  return (
    <>
      <CardGrid>
        {list.items.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </CardGrid>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
    </>
  );
}
