'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { MobileBackButton } from '@/components/app/app-shell';
import { ReadCircle } from '@/components/app/cards';
import { useMainScrollTop } from '@/components/app/main-scroll';
import { MoreMenu } from '@/components/app/menu';
import { PagedStoryGrid } from '@/components/app/paged-grid';
import { Avatar, Poster } from '@/components/app/poster';
import { cx, EmptyState, PillLink, Spinner } from '@/components/app/primitives';
import { SubscribeButton } from '@/components/app/subscribe-button';
import { useToast } from '@/components/app/toast';
import { useDominantColor } from '@/lib/client/colors';
import { compactNumber, plural, shortDate, storyKind } from '@/lib/client/format';
import { useApi } from '@/lib/client/hooks';
import type { ChannelResponse, Page, Story } from '@/lib/client/types';

export default function ChannelView({ handle }: { handle: string }) {
  const { data, error } = useApi<ChannelResponse>(`/api/channels/${handle}`);
  if (error) {
    return (
      <EmptyState
        title="Channel not found"
        text="It may have been renamed or deleted."
        action={<PillLink href="/" variant="white">Home</PillLink>}
      />
    );
  }
  if (!data) return <Spinner />;
  return <ChannelPage data={data} />;
}

/** Laid out like a Spotify artist page: big header, a play-style button, "Popular", then everything. */
function ChannelPage({ data }: { data: ChannelResponse }) {
  const { channel, owner, viewer } = data;
  const color = useDominantColor(channel.banner?.url ?? channel.avatar?.url, channel.id);
  const scrolled = useMainScrollTop() > 260;
  const [subscribers, setSubscribers] = useState(channel.stats.subscribers);
  const [subscribed, setSubscribed] = useState(Boolean(viewer?.subscribed));
  const popular = useApi<Page<Story>>(`/api/channels/${channel.handle}/stories?sort=popular&limit=5`);
  const top = popular.data?.items[0];
  const { toast } = useToast();

  const meta = [`@${channel.handle}`, plural(subscribers, 'subscriber'), plural(channel.stats.stories, 'story', 'stories')];

  const title = (
    <>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <BadgeCheck className="h-5 w-5 text-pal-accent" /> Channel
      </p>
      <h1 className="mt-1 break-words text-4xl font-black tracking-tight md:text-[clamp(40px,6vw,96px)] md:leading-none">
        {channel.name}
      </h1>
      <p className="mt-3 text-sm text-white/80">{meta.join(' • ')}</p>
    </>
  );

  return (
    <div className="relative">
      <div
        className={cx(
          'sticky top-0 z-20 -mb-16 flex h-16 items-center gap-3 px-4 transition-opacity duration-200 md:px-6',
          scrolled ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ backgroundColor: `color-mix(in srgb, ${color} 60%, black)` }}
      >
        {top && (
          <Link href={`/story/${top.id}`} aria-label={`Open ${top.title}`} tabIndex={scrolled ? 0 : -1}>
            <ReadCircle size="sm" />
          </Link>
        )}
        <span className="truncate text-xl font-bold md:text-2xl">{channel.name}</span>
      </div>

      {channel.banner ? (
        <header className="relative h-[38vh] min-h-[260px] max-h-[420px]">
          <Image src={channel.banner.url} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
          <div className="absolute left-4 top-[max(env(safe-area-inset-top),12px)] md:hidden">
            <MobileBackButton />
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6 md:px-6">{title}</div>
        </header>
      ) : (
        <header style={{ backgroundColor: color }} className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          <div className="relative flex flex-col gap-5 px-4 pb-6 pt-[max(env(safe-area-inset-top),12px)] md:flex-row md:items-end md:gap-6 md:px-6 md:pt-20">
            <MobileBackButton />
            <Avatar
              name={channel.name}
              image={channel.avatar}
              seed={channel.id}
              sizes="232px"
              className="mx-auto aspect-square w-[45%] max-w-[200px] text-6xl shadow-[0_4px_60px_rgba(0,0,0,.5)] md:mx-0 md:w-[192px] lg:w-[232px]"
            />
            <div className="min-w-0">{title}</div>
          </div>
        </header>
      )}

      <div style={{ background: `linear-gradient(color-mix(in srgb, ${color} 30%, var(--p-surface)), var(--p-surface) 232px)` }}>
        <div className="flex items-center gap-5 px-4 py-5 md:gap-6 md:px-6 md:py-6">
          {top && (
            <Link href={`/story/${top.id}`} aria-label={`Open ${top.title}`} title={`Open ${top.title}`} className="order-last ml-auto md:order-first md:ml-0">
              <ReadCircle size="lg" />
            </Link>
          )}
          {viewer?.canManage ? (
            <PillLink href={`/studio/channel/${channel.handle}`} variant="outline" size="sm">
              Manage channel
            </PillLink>
          ) : (
            <SubscribeButton
              handle={channel.handle}
              subscribed={subscribed}
              onChange={(next, count) => {
                setSubscribed(next);
                setSubscribers(count);
              }}
            />
          )}
          <MoreMenu
            items={[
              {
                label: 'Copy link',
                onSelect: () =>
                  navigator.clipboard
                    .writeText(`${window.location.origin}/channel/${channel.handle}`)
                    .then(() => toast('Link copied to clipboard'))
                    .catch(() => toast("Couldn't copy the link", 'error')),
              },
              ...(owner ? [{ label: `View ${owner.displayName}'s profile`, href: `/u/${owner.username}` }] : []),
            ]}
          />
        </div>

        {popular.data && popular.data.items.length > 0 && (
          <section className="px-2 md:px-6">
            <h2 className="mb-3 px-2 text-2xl font-bold tracking-tight md:px-0">Popular</h2>
            <ol>
              {popular.data.items.map((story, index) => (
                <li key={story.id}>
                  <Link
                    href={`/story/${story.id}`}
                    className="grid grid-cols-[24px_40px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/10 md:gap-4 md:px-4"
                  >
                    <span className="text-right text-pal-subdued tabular-nums">{index + 1}</span>
                    <Poster story={story} showTitle={false} sizes="40px" className="aspect-[2/3] w-10 rounded" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{story.title}</span>
                      <span className="block truncate text-sm text-pal-subdued">
                        {storyKind(story.type)}
                        {story.type === 'series' && ` · ${plural(story.stats.episodes, 'episode')}`}
                      </span>
                    </span>
                    <span className="text-sm text-pal-subdued">{compactNumber(story.stats.views)} reads</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 px-4 text-2xl font-bold tracking-tight md:px-6">All stories</h2>
          <PagedStoryGrid
            path={`/api/channels/${channel.handle}/stories?sort=updated`}
            empty={<p className="px-4 text-pal-subdued md:px-6">No stories published yet.</p>}
          />
        </section>

        <section className="mt-10 px-4 pb-10 md:px-6">
          <h2 className="mb-3 text-2xl font-bold tracking-tight">About</h2>
          <div className="max-w-3xl rounded-lg bg-white/[.07] p-5">
            {channel.description ? (
              <p className="whitespace-pre-line leading-relaxed">{channel.description}</p>
            ) : (
              <p className="text-pal-subdued">This channel hasn&apos;t added a description yet.</p>
            )}
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-pal-subdued">Total reads</dt>
                <dd className="font-semibold">{compactNumber(channel.stats.views)}</dd>
              </div>
              <div>
                <dt className="text-pal-subdued">Since</dt>
                <dd className="font-semibold">{shortDate(channel.createdAt)}</dd>
              </div>
              {owner && (
                <div>
                  <dt className="text-pal-subdued">Run by</dt>
                  <dd>
                    <Link href={`/u/${owner.username}`} className="font-semibold hover:underline">
                      {owner.displayName}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
