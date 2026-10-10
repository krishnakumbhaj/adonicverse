'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FieldError, FormError, TextField } from '@/components/app/fields';
import { OtpInput } from '@/components/app/otp-input';
import { PillButton } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { api, ApiClientError, errorMessage } from '@/lib/client/api';
import { AuthCard } from '../auth-card';
import { ResendCode } from '../resend-code';

type Step = 'email' | 'code' | 'password';
type CodeSent = { expiresInMinutes: number; resendAfterSeconds: number };
type Fields = Record<string, string[] | undefined>;

const TITLES: Record<Step, string> = {
  email: 'Reset your password',
  code: 'Enter the code',
  password: 'Choose a new password',
};

/** Forgot password: email → 6-digit code → new password, then straight back in. Works once a day per account. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState<CodeSent & { at: number }>();
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fail = (caught: unknown) => {
    if (caught instanceof ApiClientError && caught.fields) setFields(caught.fields);
    else setError(errorMessage(caught));
  };

  const go = (next: Step) => {
    setError(null);
    setFields({});
    setStep(next);
  };

  const sendCode = async () => {
    setError(null);
    try {
      const result = await api<CodeSent>('/api/auth/forgot-password', { method: 'POST', json: { email } });
      setSent({ ...result, at: Date.now() });
      setCode('');
      return true;
    } catch (caught) {
      fail(caught);
      return false;
    }
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    if (await sendCode()) go('code');
    setLoading(false);
  };

  const submitCode = async (value = code) => {
    if (loading) return;
    if (value.length < 6) return setFields({ code: ['Enter all 6 digits.'] });
    setError(null);
    setLoading(true);
    try {
      const result = await api<{ token: string }>('/api/auth/forgot-password/verify', { method: 'POST', json: { email, code: value } });
      setToken(result.token);
      go('password');
    } catch (caught) {
      fail(caught);
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setFields({ password: ['Use at least 8 characters.'] });
    if (password !== confirm) return setFields({ confirm: ["The passwords don't match."] });
    setLoading(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', json: { token, password } });
      toast('Password updated');
      const result = await signIn('credentials', { identifier: email, password, redirect: false });
      router.replace(result?.error ? '/sign-in' : '/');
      router.refresh();
    } catch (caught) {
      fail(caught);
      setLoading(false);
    }
  };

  const eye = (
    <button
      type="button"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      onClick={() => setShowPassword(!showPassword)}
      className="grid h-9 w-9 place-items-center text-pal-subdued hover:text-pal-text"
    >
      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  return (
    <AuthCard
      title={TITLES[step]}
      footer={
        <Link href="/sign-in" className="font-semibold text-pal-text underline hover:text-pal-accent">
          Back to log in
        </Link>
      }
    >
      {step === 'email' && (
        <form key="email" onSubmit={submitEmail} noValidate className="space-y-6 duration-300 animate-in fade-in">
          <p className="text-pal-subdued">
            Enter the email you signed up with and we&apos;ll send you a code to choose a new password. You can do this once a
            day.
          </p>
          <FormError message={error} />
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFields({});
            }}
            error={fields.email?.[0]}
          />
          <PillButton type="submit" size="lg" center loading={loading} disabled={!email.trim()}>
            Send code
          </PillButton>
        </form>
      )}

      {step === 'code' && (
        <form
          key="code"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCode();
          }}
          noValidate
          className="space-y-6 duration-300 animate-in fade-in slide-in-from-right-6"
        >
          <p className="text-pal-subdued">
            If an account uses <span className="break-all font-semibold text-pal-text">{email}</span>, we sent it a 6-digit
            code.{sent && ` It works for ${sent.expiresInMinutes} minutes.`}
          </p>
          <FormError message={error} />
          <div>
            <OtpInput
              value={code}
              onChange={(value) => {
                setCode(value);
                setFields({});
              }}
              onComplete={(value) => void submitCode(value)}
              invalid={Boolean(fields.code)}
              disabled={loading}
              autoFocus
            />
            <FieldError message={fields.code?.[0]} />
          </div>
          <PillButton type="submit" size="lg" center loading={loading}>
            Continue
          </PillButton>
          {sent && (
            <ResendCode
              availableAt={sent.at + sent.resendAfterSeconds * 1000}
              onResend={async () => (await sendCode()) && toast('We sent you a new code')}
            />
          )}
          <p className="text-center text-sm">
            <button type="button" onClick={() => go('email')} className="font-semibold text-pal-subdued underline hover:text-pal-text">
              Use a different email
            </button>
          </p>
        </form>
      )}

      {step === 'password' && (
        <form key="password" onSubmit={submitPassword} noValidate className="space-y-6 duration-300 animate-in fade-in slide-in-from-right-6">
          <FormError message={error} />
          {/* Tells password managers which account the new password is for. */}
          <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
          <TextField
            label="New password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFields({});
            }}
            error={fields.password?.[0]}
            hint="At least 8 characters."
            trailing={eye}
          />
          <TextField
            label="Confirm new password"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              setFields({});
            }}
            error={fields.confirm?.[0]}
          />
          <PillButton type="submit" size="lg" center loading={loading}>
            Save and log in
          </PillButton>
        </form>
      )}
    </AuthCard>
  );
}
