import type { Metadata } from 'next';
import VerifyEmail from './verify-email';

export const metadata: Metadata = { title: 'Verify email' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <VerifyEmail token={typeof token === 'string' ? token : ''} />;
}
