'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { api, errorMessage } from '@/lib/client/api';
import { useRequireSignIn, useRevalidate } from '@/lib/client/hooks';
import { PillButton } from './primitives';
import { useToast } from './toast';

/** Spotify's "Follow" pill, for channels. */
export function SubscribeButton({
  handle,
  subscribed,
  onChange,
  size = 'md',
}: {
  handle: string;
  subscribed: boolean;
  onChange?: (subscribed: boolean, subscribers: number) => void;
  size?: 'sm' | 'md';
}) {
  const [busy, setBusy] = useState(false);
  const requireSignIn = useRequireSignIn();
  const revalidate = useRevalidate();
  const { toast } = useToast();

  const toggle = async () => {
    if (!requireSignIn()) return;
    setBusy(true);
    try {
      const result = await api<{ subscribed: boolean; subscribers: number }>(`/api/channels/${handle}/subscribe`, {
        method: subscribed ? 'DELETE' : 'POST',
      });
      onChange?.(result.subscribed, result.subscribers);
      toast(result.subscribed ? 'Subscribed. New episodes will show up in your feed.' : 'Unsubscribed');
      revalidate('/api/me/subscriptions', '/api/me/feed', `/api/channels/${handle}`);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PillButton
      variant="outline"
      size={size === 'sm' ? 'sm' : 'md'}
      icon={subscribed ? <Check /> : <Plus />}
      onClick={toggle}
      disabled={busy}
      aria-pressed={subscribed}
    >
      {subscribed ? 'Subscribed' : 'Subscribe'}
    </PillButton>
  );
}
