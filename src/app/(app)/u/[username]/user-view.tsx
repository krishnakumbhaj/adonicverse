'use client';

import { MobileBackButton } from '@/components/app/app-shell';
import { CardGrid, ChannelCard } from '@/components/app/cards';
import { Avatar } from '@/components/app/poster';
import { EmptyState, PillLink, Spinner } from '@/components/app/primitives';
import { useDominantColor } from '@/lib/client/colors';
import { plural } from '@/lib/client/format';
import { useApi, useCurrentUser } from '@/lib/client/hooks';
import type { Channel, Profile } from '@/lib/client/types';

type UserResponse = { user: Profile; channels: Channel[] };

export default function UserView({ username }: { username: string }) {
  const { data, error } = useApi<UserResponse>(`/api/users/${username}`);
  if (error) return <EmptyState title="User not found" action={<PillLink href="/" variant="white">Home</PillLink>} />;
  if (!data) return <Spinner />;
  return <UserPage data={data} />;
}

/** Spotify's profile page: round photo, "Profile", the name in huge type, then their channels. */
function UserPage({ data }: { data: UserResponse }) {
  const { user, channels } = data;
  const { user: me } = useCurrentUser();
  const color = useDominantColor(user.avatar?.url, user.id);
  const isMe = me?.id === user.id;

  return (
    <div className="pb-10">
      <header style={{ backgroundColor: color }} className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
        <div className="relative flex flex-col gap-5 px-4 pb-6 pt-[max(env(safe-area-inset-top),12px)] md:flex-row md:items-end md:gap-6 md:px-6 md:pt-20">
          <MobileBackButton />
          <Avatar
            name={user.displayName}
            image={user.avatar}
            seed={user.id}
            sizes="232px"
            className="mx-auto aspect-square w-[45%] max-w-[200px] text-6xl shadow-[0_4px_60px_rgba(0,0,0,.5)] md:mx-0 md:w-[192px] lg:w-[232px]"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Profile</p>
            <h1 className="mt-1 break-words text-4xl font-black tracking-tight md:text-[clamp(40px,6vw,96px)] md:leading-none">
              {user.displayName}
            </h1>
            <p className="mt-3 text-sm text-white/80">
              @{user.username} • {plural(channels.length, 'channel')}
            </p>
          </div>
        </div>
      </header>

      <div style={{ background: `linear-gradient(color-mix(in srgb, ${color} 30%, var(--p-surface)), var(--p-surface) 232px)` }}>
        <div className="flex items-center gap-4 px-4 py-5 md:px-6 md:py-6">
          {isMe && (
            <PillLink href="/settings" variant="outline" size="sm">
              Edit profile
            </PillLink>
          )}
        </div>
        {user.bio && <p className="max-w-3xl whitespace-pre-line px-4 pb-6 text-pal-subdued md:px-6">{user.bio}</p>}

        <h2 className="mb-2 px-4 text-2xl font-bold tracking-tight md:px-6">Channels</h2>
        {channels.length ? (
          <CardGrid>
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </CardGrid>
        ) : (
          <p className="px-4 text-pal-subdued md:px-6">
            {isMe ? 'You have no channels yet. Create one in Studio to start publishing.' : 'No channels yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
