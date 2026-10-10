import type { Metadata } from 'next';
import ResetPasswordForm from './reset-password-form';

export const metadata: Metadata = { title: 'Choose a new password' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === 'string' ? token : ''} />;
}
