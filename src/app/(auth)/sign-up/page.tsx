import type { Metadata } from 'next';
import { googleSignInEnabled } from '@/lib/auth';
import SignUpForm from './sign-up-form';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignUpPage() {
  return <SignUpForm google={googleSignInEnabled} />;
}
