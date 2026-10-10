import type { Metadata } from 'next';
import { googleSignInEnabled } from '@/lib/auth';
import { safeCallbackUrl } from '../auth-card';
import SignInForm from './sign-in-form';

export const metadata: Metadata = { title: 'Log in' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <SignInForm
      callbackUrl={safeCallbackUrl(params.callbackUrl)}
      google={googleSignInEnabled}
      errorCode={typeof params.error === 'string' ? params.error : undefined}
    />
  );
}
