'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { FormError, TextField } from '@/components/app/fields';
import { PillButton } from '@/components/app/primitives';
import { useCurrentUser } from '@/lib/client/hooks';
import { AuthCard } from '../auth-card';
import { GoogleButton } from '../google-button';

/** Text for the `?error=` codes NextAuth sends back to this page. Only Google sign-in uses them. */
function errorText(code?: string) {
  if (!code || code === 'SessionRequired') return null;
  if (code === 'AccessDenied') {
    return "We couldn't log you in with Google. Make sure your Google account has a verified email address.";
  }
  return "Logging in with Google didn't work. Please try again.";
}

type Props = { callbackUrl: string; google: boolean; errorCode?: string };

export default function SignInForm({ callbackUrl, google, errorCode }: Props) {
  const router = useRouter();
  const { signedIn } = useCurrentUser();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() => errorText(errorCode));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signedIn) router.replace(callbackUrl);
  }, [signedIn, callbackUrl, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn('credentials', { identifier, password, redirect: false });
    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Incorrect email/username or password.' : result.error);
      setLoading(false);
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  };

  return (
    <AuthCard
      title={`Log in to ${siteConfig.name}`}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="font-semibold text-pal-text underline hover:text-pal-accent">
            Sign up
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-6">
          <FormError message={error} />
        </div>
      )}
      {google && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <hr className="my-8 border-pal-highlight" />
        </>
      )}
      <form onSubmit={submit} className="space-y-4">
        <TextField
          label="Email or username"
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Email or username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <TextField
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          trailing={
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="grid h-9 w-9 place-items-center text-pal-subdued hover:text-pal-text"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />
        <PillButton type="submit" size="lg" center loading={loading} className="!mt-8">
          Log In
        </PillButton>
        <p className="pt-4 text-center">
          <Link href="/forgot-password" className="font-semibold underline hover:text-pal-accent">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
