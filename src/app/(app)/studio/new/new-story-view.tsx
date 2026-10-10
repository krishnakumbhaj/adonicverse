'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { MobileHeader } from '@/components/app/app-shell';
import { EmptyState, PillButton, PillLink, Spinner } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { StoryFields, type StoryFormValues } from '@/components/studio/story-fields';
import { api, ApiClientError, errorMessage } from '@/lib/client/api';
import { useApi, useRevalidate } from '@/lib/client/hooks';
import type { Channel, Story } from '@/lib/client/types';

const EMPTY: StoryFormValues = {
  channelId: '',
  type: 'series',
  title: '',
  synopsis: '',
  genres: [],
  tags: [],
  language: 'en',
  contentRating: 'general',
  progress: 'ongoing',
};

export default function NewStoryView({ channelId }: { channelId?: string }) {
  const router = useRouter();
  const { data } = useApi<{ items: Channel[] }>('/api/me/channels');
  const revalidate = useRevalidate();
  const { toast } = useToast();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>();
  const [saving, setSaving] = useState(false);
  const channels = data?.items;

  // Default to the channel from the link, or the first one.
  useEffect(() => {
    if (!channels?.length || values.channelId) return;
    const preferred = channels.find((channel) => channel.id === channelId) ?? channels[0];
    setValues((current) => ({ ...current, channelId: preferred.id }));
  }, [channels, channelId, values.channelId]);

  if (!channels) return <Spinner />;
  if (channels.length === 0) {
    return (
      <EmptyState
        title="Create a channel first"
        text="Stories are published on your channel. It only takes a moment."
        action={<PillLink href="/studio">Create channel</PillLink>}
      />
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors(undefined);
    try {
      const { progress: _progress, ...body } = values;
      const { story } = await api<{ story: Story }>('/api/stories', { method: 'POST', json: body });
      toast('Story created. Now add your first episode.');
      revalidate('/stories?status=all');
      router.push(`/studio/story/${story.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) setErrors(error.fields);
      toast(errorMessage(error), 'error');
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-16 md:px-6">
      <MobileHeader title="New story" />
      <Link href="/studio" className="mt-6 hidden items-center gap-1 text-sm font-semibold text-pal-subdued hover:text-pal-text md:inline-flex">
        <ChevronLeft className="h-4 w-4" /> Studio
      </Link>
      <h1 className="mt-2 hidden text-4xl font-black tracking-tight md:block">New story</h1>
      <form onSubmit={submit} className="mt-6 max-w-2xl">
        <StoryFields values={values} onChange={setValues} errors={errors} mode="create" channels={channels} />
        <div className="mt-8 flex gap-2">
          <PillButton type="submit" size="lg" loading={saving} disabled={!values.title.trim() || values.genres.length === 0}>
            Create story
          </PillButton>
          <PillLink href="/studio" variant="ghost" size="lg">
            Cancel
          </PillLink>
        </div>
        <p className="mt-3 text-sm text-pal-subdued">It starts as a draft. Nobody sees it until you publish.</p>
      </form>
    </div>
  );
}
