'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { MobileHeader } from '@/components/app/app-shell';
import { LoadMore } from '@/components/app/paged-grid';
import { Avatar, Poster } from '@/components/app/poster';
import { cx, EmptyState, Spinner } from '@/components/app/primitives';
import { api } from '@/lib/client/api';
import { timeAgo } from '@/lib/client/format';
import { usePagedList, useRevalidate } from '@/lib/client/hooks';
import type { Notification } from '@/lib/client/types';

/** What a notification says and where it leads. */
function describe(item: Notification): { text: React.ReactNode; href: string } {
  const actor = <b>{item.actor?.displayName ?? 'Someone'}</b>;
  const story = <b>{item.story?.title ?? 'a story'}</b>;
  const storyHref = item.story ? `/story/${item.story.id}` : '/';
  const episodeHref = item.episode ? `/read/${item.episode.id}` : storyHref;

  switch (item.type) {
    case 'new_subscriber':
      return { text: <>{actor} subscribed to <b>{item.channel?.name}</b></>, href: item.actor ? `/u/${item.actor.username}` : '/' };
    case 'new_story':
      return { text: <><b>{item.channel?.name}</b> published a new story: {story}</>, href: storyHref };
    case 'new_episode':
      return { text: <>New episode of {story}: <b>{item.episode?.title}</b></>, href: episodeHref };
    case 'new_comment':
      return { text: <>{actor} commented on <b>{item.episode?.title}</b>: “{item.comment?.excerpt}”</>, href: episodeHref };
    case 'comment_reply':
      return { text: <>{actor} replied to your comment: “{item.comment?.excerpt}”</>, href: episodeHref };
    case 'new_review':
      return { text: <>{actor} reviewed {story}</>, href: storyHref };
  }
}

export default function NotificationsView() {
  const list = usePagedList<Notification>('/api/me/notifications', 30);
  const revalidate = useRevalidate();
  const markedRead = useRef(false);

  // Opening this page counts as seeing everything; the unread ones stay highlighted until you leave.
  useEffect(() => {
    if (markedRead.current || !list.items.some((item) => !item.read)) return;
    markedRead.current = true;
    api('/api/me/notifications/read', { method: 'POST', json: {} })
      .then(() => revalidate('unread=true'))
      .catch(() => {
        markedRead.current = false;
      });
  }, [list.items, revalidate]);

  return (
    <div className="pb-10">
      <MobileHeader title="Notifications" />
      <h1 className="hidden px-6 pb-4 pt-8 text-3xl font-bold tracking-tight md:block">Notifications</h1>

      {list.isLoading ? (
        <Spinner />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="You're all caught up"
          text="New episodes from your subscriptions, replies and reviews will show up here."
        />
      ) : (
        <ul className="px-2 md:px-4">
          {list.items.map((item) => {
            const { text, href } = describe(item);
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={cx(
                    'flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-white/[.07]',
                    !item.read && 'bg-white/[.04]',
                  )}
                >
                  {item.story && (item.type === 'new_story' || item.type === 'new_episode') ? (
                    <Poster story={{ ...item.story, poster: item.story.poster }} showTitle={false} sizes="48px" className="h-12 w-12 rounded" />
                  ) : item.actor ? (
                    <Avatar name={item.actor.displayName} image={item.actor.avatar} seed={item.actor.id} className="h-12 w-12 text-lg" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-pal-elevated">
                      <Bell className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm">{text}</span>
                    <span className="text-xs text-pal-subdued">{timeAgo(item.createdAt)}</span>
                  </span>
                  {!item.read && <span aria-label="Unread" className="h-2.5 w-2.5 shrink-0 rounded-full bg-pal-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
    </div>
  );
}
