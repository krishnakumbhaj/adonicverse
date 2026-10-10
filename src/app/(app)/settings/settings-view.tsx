'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { Check, CircleCheck, LogOut, Mail } from 'lucide-react';
import { MobileHeader } from '@/components/app/app-shell';
import { TextAreaField, TextField } from '@/components/app/fields';
import { Avatar } from '@/components/app/poster';
import { PillButton, Spinner } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { CROP_PRESETS } from '@/components/studio/image-cropper';
import { ImageUploadButton } from '@/components/studio/image-upload-button';
import { api, ApiClientError, errorMessage } from '@/lib/client/api';
import { useApi, useCurrentUser } from '@/lib/client/hooks';
import type { Account } from '@/lib/client/types';

type Fields = Record<string, string[] | undefined> | undefined;
const fieldError = (fields: Fields, name: string) => fields?.[name]?.[0];

export default function SettingsView() {
  const { data, mutate } = useApi<{ user: Account }>('/api/me');

  return (
    <div className="pb-16">
      <MobileHeader title="Settings" />
      <h1 className="hidden px-6 pb-2 pt-8 text-3xl font-bold tracking-tight md:block">Settings</h1>
      {!data ? (
        <Spinner />
      ) : (
        <div className="max-w-2xl space-y-6 px-4 pt-4 md:px-6">
          <ProfileSection account={data.user} onSaved={(user) => mutate({ user }, { revalidate: false })} />
          <EmailSection account={data.user} />
          <PasswordSection />
          <section className="rounded-lg bg-white/[.07] p-5 md:p-6">
            <h2 className="text-xl font-bold">Log out</h2>
            <p className="mt-1 text-sm text-pal-subdued">Sign out of your account on this device.</p>
            <PillButton variant="outline" icon={<LogOut />} className="mt-4" onClick={() => signOut({ callbackUrl: '/' })}>
              Log out
            </PillButton>
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileSection({ account, onSaved }: { account: Account; onSaved: (user: Account) => void }) {
  const { refreshSession } = useCurrentUser();
  const { toast } = useToast();
  const [form, setForm] = useState({ displayName: account.displayName, username: account.username, bio: account.bio });
  const [avatar, setAvatar] = useState(account.avatar);
  const [fields, setFields] = useState<Fields>();
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFields(undefined);
    try {
      const { user } = await api<{ user: Account }>('/api/me', { method: 'PATCH', json: form });
      onSaved(user);
      await refreshSession(); // the session holds the username and name
      toast('Profile saved');
    } catch (error) {
      if (error instanceof ApiClientError) setFields(error.fields);
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await api('/api/me/avatar', { method: 'DELETE' });
      setAvatar(null);
      await refreshSession();
      toast('Photo removed');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <section className="rounded-lg bg-white/[.07] p-5 md:p-6">
      <h2 className="text-xl font-bold">Profile</h2>
      <div className="mt-5 flex items-center gap-5">
        <Avatar name={form.displayName || account.username} image={avatar} seed={account.id} sizes="96px" className="h-24 w-24 text-4xl shadow-lg" />
        <div className="flex flex-wrap gap-2">
          <ImageUploadButton
            path="/api/me/avatar"
            field="avatar"
            label="Change photo"
            crop={CROP_PRESETS.avatar}
            onUploaded={(image) => {
              setAvatar(image);
              void refreshSession();
            }}
          />
          {avatar && (
            <PillButton variant="ghost" size="sm" onClick={removeAvatar}>
              Remove
            </PillButton>
          )}
        </div>
      </div>
      <form onSubmit={save} className="mt-6 space-y-5">
        <TextField
          label="Name"
          name="displayName"
          value={form.displayName}
          maxLength={50}
          onChange={(event) => setForm({ ...form, displayName: event.target.value })}
          error={fieldError(fields, 'displayName')}
        />
        <TextField
          label="Username"
          name="username"
          value={form.username}
          maxLength={20}
          onChange={(event) => setForm({ ...form, username: event.target.value })}
          hint={`Your profile: /u/${form.username || account.username}`}
          error={fieldError(fields, 'username')}
        />
        <TextAreaField
          label="Bio"
          name="bio"
          value={form.bio}
          maxLength={300}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
          hint={`Markdown works: **bold**, *italic*, [links](https://…). ${form.bio.length}/300`}
          error={fieldError(fields, 'bio')}
        />
        <PillButton type="submit" icon={<Check />} loading={saving}>
          Save profile
        </PillButton>
      </form>
    </section>
  );
}

function EmailSection({ account }: { account: Account }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await api('/api/auth/verify-email/resend', { method: 'POST' });
      toast('Verification email sent. Check your inbox.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-lg bg-white/[.07] p-5 md:p-6">
      <h2 className="text-xl font-bold">Email</h2>
      <p className="mt-2 break-all">{account.email}</p>
      {account.emailVerified ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-pal-success">
          <CircleCheck className="h-4 w-4" /> Verified
        </p>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-pal-warning">Not verified yet. Check your inbox for the link we sent.</p>
          <PillButton variant="outline" size="sm" icon={<Mail />} className="mt-3" loading={sending} onClick={resend}>
            Resend verification email
          </PillButton>
        </div>
      )}
    </section>
  );
}

function PasswordSection() {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [fields, setFields] = useState<Fields>();
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFields(undefined);
    try {
      await api('/api/me/password', { method: 'POST', json: form });
      setForm({ currentPassword: '', newPassword: '' });
      toast('Password changed');
    } catch (error) {
      if (error instanceof ApiClientError) setFields(error.fields);
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg bg-white/[.07] p-5 md:p-6">
      <h2 className="text-xl font-bold">Password</h2>
      <form onSubmit={save} className="mt-5 space-y-5">
        <TextField
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
          error={fieldError(fields, 'currentPassword')}
        />
        <TextField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          hint="At least 8 characters."
          error={fieldError(fields, 'newPassword')}
        />
        <PillButton type="submit" icon={<Check />} loading={saving} disabled={!form.currentPassword || form.newPassword.length < 8}>
          Change password
        </PillButton>
      </form>
    </section>
  );
}
