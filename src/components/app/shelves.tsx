'use client';

import { useApi } from '@/lib/client/hooks';
import type { Channel, Page, Story } from '@/lib/client/types';
import { ChannelCard, Shelf, ShelfItem, StoryCard } from './cards';

/** Placeholder while a shelf loads. */
export function ShelfSkeleton() {
  return (
    <div className="mt-6 px-4 md:mt-8 md:px-6" aria-hidden>
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-white/[.07]" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="w-[136px] shrink-0 md:w-[164px]">
            <div className="aspect-[2/3] animate-pulse rounded-md bg-white/[.07]" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-white/[.07]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A shelf of stories from an API list path. Hidden when there's nothing to show. */
export function StoryShelf({ title, path, href, exclude }: { title: string; path: string; href?: string; exclude?: string }) {
  const { data } = useApi<Page<Story>>(path);
  if (!data) return <ShelfSkeleton />;
  const stories = data.items.filter((story) => story.id !== exclude);
  if (stories.length === 0) return null;
  return (
    <Shelf title={title} href={href}>
      {stories.map((story) => (
        <ShelfItem key={story.id}>
          <StoryCard story={story} />
        </ShelfItem>
      ))}
    </Shelf>
  );
}

export function ChannelShelf({ title, path, href }: { title: string; path: string; href?: string }) {
  const { data } = useApi<Page<Channel>>(path);
  if (!data) return <ShelfSkeleton />;
  if (data.items.length === 0) return null;
  return (
    <Shelf title={title} href={href}>
      {data.items.map((channel) => (
        <ShelfItem key={channel.id}>
          <ChannelCard channel={channel} />
        </ShelfItem>
      ))}
    </Shelf>
  );
}
