'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useConfirm } from '@/components/app/confirm';
import { Avatar } from '@/components/app/poster';
import { EmptyState, PillButton, PillLink, Spinner } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { ChannelForm } from '@/components/studio/channel-form';
import { CROP_PRESETS } from '@/components/studio/image-cropper';
import { ImageUploadButton } from '@/components/studio/image-upload-button';
import { StudioStoryList } from '@/components/studio/story-list';
import { api, errorMessage } from '@/lib/client/api';
import { seedGradient } from '@/lib/client/colors';
import { useApi, useRevalidate } from '@/lib/client/hooks';
import type { ChannelResponse } from '@/lib/client/types';

export default function StudioChannelView({ handle }: { handle: string }) {
  const router = useRouter();
  const { data, error, mutate } = useApi<ChannelResponse>(`/api/channels/${handle}`);
  const revalidate = useRevalidate();
  const [dialog, confirm] = useConfirm();
  const { toast } = useToast();

  if (error) return <EmptyState title="Channel not found" action={<PillLink href="/studio" variant="white">Back to Studio</PillLink>} />;
  if (!data) return <Spinner />;
  if (!data.viewer?.canManage) {
    return <EmptyState title="Not your channel" text="Only the channel's owner can manage it." action={<PillLink href={`/channel/${handle}`} variant="white">View channel</PillLink>} />;
  }

  const { channel } = data;
  const refresh = () => {
    mutate();
    revalidate('/api/me/channels');
  };

  const removeImage = async (field: 'avatar' | 'banner') => {
    try {
      await api(`/api/channels/${channel.handle}/${field}`, { method: 'DELETE' });
      refresh();
    } catch (caught) {
      toast(errorMessage(caught), 'error');
    }
  };

  const deleteChannel = async () => {
    const ok = await confirm({
      title: `Delete ${channel.name}?`,
      text: 'All of its stories, episodes, comments and reviews will be deleted for good. This can’t be undone.',
      confirmLabel: 'Delete channel',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/channels/${channel.handle}`, { method: 'DELETE' });
      toast('Channel deleted');
      revalidate('/api/me');
      router.push('/studio');
    } catch (caught) {
      toast(errorMessage(caught), 'error');
    }
  };

  return (
    <div className="px-4 pb-16 pt-4 md:px-6 md:pt-6">
      {dialog}
      <Link href="/studio" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-pal-subdued hover:text-pal-text">
        <ChevronLeft className="h-4 w-4" /> Studio
      </Link>

      <div className="relative h-32 overflow-hidden rounded-lg md:h-48" style={channel.banner ? undefined : { background: seedGradient(channel.id) }}>
        {channel.banner && <Image src={channel.banner.url} alt="" fill sizes="100vw" className="object-cover" />}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <ImageUploadButton
            path={`/api/channels/${channel.handle}/banner`}
            field="banner"
            label="Change banner"
            crop={CROP_PRESETS.banner}
            onUploaded={refresh}
          />
          {channel.banner && (
            <PillButton variant="white" size="sm" onClick={() => removeImage('banner')}>
              Remove
            </PillButton>
          )}
        </div>
      </div>

      <div className="-mt-10 flex flex-wrap items-end gap-4 px-2 md:-mt-12 md:px-4">
        <Avatar name={channel.name} image={channel.avatar} seed={channel.id} sizes="120px" className="h-24 w-24 text-4xl ring-4 ring-pal-surface md:h-28 md:w-28" />
        <div className="flex gap-2 pb-1">
          <ImageUploadButton
            path={`/api/channels/${channel.handle}/avatar`}
            field="avatar"
            label="Change picture"
            variant="outline"
            crop={CROP_PRESETS.avatar}
            onUploaded={refresh}
          />
          {channel.avatar && (
            <PillButton variant="ghost" size="sm" onClick={() => removeImage('avatar')}>
              Remove
            </PillButton>
          )}
        </div>
        <PillLink href={`/channel/${channel.handle}`} variant="outline" size="sm" className="mb-1 ml-auto">
          View channel
        </PillLink>
      </div>

      <section className="mt-8 max-w-2xl rounded-lg bg-white/[.07] p-5 md:p-6">
        <h2 className="mb-5 text-xl font-bold">Channel details</h2>
        <ChannelForm
          key={channel.handle}
          channel={channel}
          onSaved={(saved) => {
            revalidate('/api/me/channels');
            if (saved.handle !== channel.handle) router.replace(`/studio/channel/${saved.handle}`);
            else mutate();
          }}
        />
      </section>

      <StudioStoryList channel={channel} />

      <section className="mt-12 max-w-2xl rounded-lg bg-white/[.04] p-5 md:p-6">
        <h2 className="text-xl font-bold text-pal-danger">Delete channel</h2>
        <p className="mt-1 text-sm text-pal-subdued">Removes the channel and everything in it. This can&apos;t be undone.</p>
        <PillButton variant="danger" className="mt-4" onClick={deleteChannel}>
          Delete channel
        </PillButton>
      </section>
    </div>
  );
}
