'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { PillLink } from '@/components/app/primitives';
import { api, errorMessage } from '@/lib/client/api';
import { AuthCard } from '../auth-card';

/** Confirms the email as soon as the link from the verification email is opened. */
export default function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<{ status: 'working' | 'done' | 'failed'; message?: string }>(
    token ? { status: 'working' } : { status: 'failed', message: 'This verification link is incomplete.' },
  );
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use, so make sure the request is only sent once.
    if (!token || started.current) return;
    started.current = true;
    api('/api/auth/verify-email', { method: 'POST', json: { token } })
      .then(() => setState({ status: 'done' }))
      .catch((error) => setState({ status: 'failed', message: errorMessage(error) }));
  }, [token]);

  return (
    <AuthCard title={state.status === 'done' ? 'Email verified' : state.status === 'failed' ? 'Link not valid' : 'Verifying…'}>
      <div className="flex flex-col items-center gap-4 text-center">
        {state.status === 'working' && <LoaderCircle className="h-10 w-10 animate-spin text-pal-subdued" />}
        {state.status === 'done' && (
          <>
            <CircleCheck className="h-12 w-12 text-pal-success" />
            <p className="text-pal-subdued">Thanks! Your email address is confirmed.</p>
          </>
        )}
        {state.status === 'failed' && (
          <>
            <CircleAlert className="h-12 w-12 text-pal-danger" />
            <p className="text-pal-subdued">{state.message} You can ask for a new link in Settings.</p>
          </>
        )}
        {state.status !== 'working' && (
          <PillLink href="/" size="lg" center className="mt-4">
            Go to Home
          </PillLink>
        )}
      </div>
    </AuthCard>
  );
}
