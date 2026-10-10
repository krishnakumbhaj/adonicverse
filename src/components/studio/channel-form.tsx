'use client';

import { useState } from 'react';
import { TextAreaField, TextField } from '@/components/app/fields';
import { PillButton } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { api, ApiClientError, errorMessage } from '@/lib/client/api';
import type { Channel } from '@/lib/client/types';

type Errors = Record<string, string[] | undefined> | undefined;

/** Create a channel, or edit one when `channel` is given. */
export function ChannelForm({
  channel,
  onSaved,
  onCancel,
}: {
  channel?: Channel;
  onSaved: (channel: Channel) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    handle: channel?.handle ?? '',
    name: channel?.name ?? '',
    description: channel?.description ?? '',
  });
  const [errors, setErrors] = useState<Errors>();
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors(undefined);
    try {
      const result = await api<{ channel: Channel }>(channel ? `/api/channels/${channel.handle}` : '/api/channels', {
        method: channel ? 'PATCH' : 'POST',
        json: form,
      });
      toast(channel ? 'Channel saved' : 'Channel created');
      onSaved(result.channel);
    } catch (error) {
      if (error instanceof ApiClientError) setErrors(error.fields);
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <TextField
        label="Channel name"
        name="name"
        value={form.name}
        maxLength={60}
        placeholder="e.g. Midnight Tales"
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        error={errors?.name?.[0]}
      />
      <TextField
        label="Handle"
        name="handle"
        value={form.handle}
        maxLength={30}
        placeholder="midnight_tales"
        onChange={(event) => setForm({ ...form, handle: event.target.value.replace(/^@/, '') })}
        hint={`Your channel link: /channel/${form.handle.toLowerCase() || 'your_handle'}`}
        error={errors?.handle?.[0]}
      />
      <TextAreaField
        label="Description"
        name="description"
        value={form.description}
        maxLength={1000}
        placeholder="What kind of stories will readers find here?"
        onChange={(event) => setForm({ ...form, description: event.target.value })}
        error={errors?.description?.[0]}
      />
      <div className="flex gap-2">
        <PillButton type="submit" loading={saving}>
          {channel ? 'Save changes' : 'Create channel'}
        </PillButton>
        {onCancel && (
          <PillButton variant="ghost" onClick={onCancel}>
            Cancel
          </PillButton>
        )}
      </div>
    </form>
  );
}
