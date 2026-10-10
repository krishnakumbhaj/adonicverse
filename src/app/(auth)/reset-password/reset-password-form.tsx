'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FormError, TextField } from '@/components/app/fields';
import { PillButton, PillLink } from '@/components/app/primitives';
import { api, errorMessage } from '@/lib/client/api';
import { AuthCard } from '../auth-card';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Link not valid">
        <p className="text-center text-pal-subdued">This reset link is incomplete. Ask for a new one.</p>
        <PillLink href="/forgot-password" size="lg" center className="mt-8">
          Get a new link
        </PillLink>
      </AuthCard>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The passwords don't match.");
    setLoading(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', json: { token, password } });
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Password updated">
        <p className="text-center text-pal-subdued">You can now log in with your new password.</p>
        <PillLink href="/sign-in" size="lg" center className="mt-8">
          Log in
        </PillLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link href="/sign-in" className="font-semibold text-pal-text underline hover:text-pal-accent">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="At least 8 characters."
          required
          minLength={8}
        />
        <TextField
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        <PillButton type="submit" size="lg" center loading={loading} disabled={password.length < 8} className="!mt-8">
          Set password
        </PillButton>
      </form>
    </AuthCard>
  );
}
