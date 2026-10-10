'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { LIMITS } from '@/config/content';
import { MobileHeader } from '@/components/app/app-shell';
import { Avatar } from '@/components/app/poster';
import { PillButton, PillLink, Spinner } from '@/components/app/primitives';
import { ChannelForm } from '@/components/studio/channel-form';
import { StudioStoryList } from '@/components/studio/story-list';
import { seedGradient } from '@/lib/client/colors';
import { compactNumber } from '@/lib/client/format';
import { useApi } from '@/lib/client/hooks';
import type { Channel } from '@/lib/client/types';

/** The writer's home: their channels with stats, and every story they're working on. */
export default function StudioView() {
  const { data, mutate } = useApi<{ items: Channel[] }>('/api/me/channels');
  const [creating, setCreating] = useState(false);
  const channels = data?.items;

  return (
    <div className="px-4 pb-16 md:px-6">
      <MobileHeader title="Studio" />
      <header className="hidden pb-2 pt-8 md:block">
        <h1 className="text-4xl font-black tracking-tight">Studio</h1>
        <p className="mt-1 text-pal-subdued">Write, publish and grow your stories.</p>
      </header>

      {!channels ? (
        <Spinner />
      ) : channels.length === 0 ? (
        <section className="mx-auto mt-6 max-w-xl rounded-lg bg-white/[.07] p-6 md:p-8">
          <h2 className="text-2xl font-bold tracking-tight">Create your channel</h2>
          <p className="mb-6 mt-2 text-pal-subdued">
            A channel is your home as a writer. Readers subscribe to it and find all your stories there.
          </p>
          <ChannelForm onSaved={() => mutate()} />
        </section>
      ) : (
        <>
          <section className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Your channels</h2>
              {channels.length < LIMITS.channelsPerUser && !creating && (
                <PillButton variant="outline" size="sm" icon={<Plus />} onClick={() => setCreating(true)}>
                  New channel
                </PillButton>
              )}
            </div>
            {creating && (
              <div className="mb-4 max-w-xl rounded-lg bg-white/[.07] p-5">
                <ChannelForm
                  onCancel={() => setCreating(false)}
                  onSaved={() => {
                    setCreating(false);
                    mutate();
                  }}
                />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {channels.map((channel) => (
                <ChannelSummary key={channel.id} channel={channel} />
              ))}
            </div>
          </section>
          {channels.map((channel) => (
            <StudioStoryList key={channel.id} channel={channel} />
          ))}
        </>
      )}
    </div>
  );
}

function ChannelSummary({ channel }: { channel: Channel }) {
  const stats = [
    { label: 'Subscribers', value: channel.stats.subscribers },
    { label: 'Stories', value: channel.stats.stories },
    { label: 'Reads', value: channel.stats.views },
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white/[.07]">
      <div className="relative h-20" style={channel.banner ? undefined : { background: seedGradient(channel.id) }}>
        {channel.banner && <Image src={channel.banner.url} alt="" fill sizes="400px" className="object-cover" />}
      </div>
      <div className="px-5 pb-5">
        <Avatar name={channel.name} image={channel.avatar} seed={channel.id} className="-mt-8 h-16 w-16 text-2xl ring-4 ring-pal-surface" />
        <Link href={`/channel/${channel.handle}`} className="mt-2 block truncate text-lg font-bold hover:underline">
          {channel.name}
        </Link>
        <p className="text-sm text-pal-subdued">@{channel.handle}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md bg-white/[.05] py-2">
              <dd className="text-lg font-bold tabular-nums">{compactNumber(stat.value)}</dd>
              <dt className="text-xs text-pal-subdued">{stat.label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <PillLink href={`/studio/new?channel=${channel.id}`} size="sm" icon={<Plus />}>
            New story
          </PillLink>
          <PillLink href={`/studio/channel/${channel.handle}`} variant="outline" size="sm">
            Manage
          </PillLink>
        </div>
      </div>
    </div>
  );
}
