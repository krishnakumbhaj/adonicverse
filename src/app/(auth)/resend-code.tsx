'use client';

import { useEffect, useState } from 'react';

/** "Didn't get it? Resend code", counting down until another code may be sent. */
export function ResendCode({ availableAt, onResend }: { availableAt: number; onResend: () => Promise<unknown> }) {
  const [now, setNow] = useState(() => Date.now());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const wait = Math.max(0, Math.ceil((availableAt - now) / 1000));

  return (
    <p className="text-center text-sm text-pal-subdued">
      Didn&apos;t get it? Check your spam folder, or{' '}
      {wait > 0 ? (
        <span className="tabular-nums">resend in 0:{String(wait).padStart(2, '0')}</span>
      ) : (
        <button
          type="button"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try {
              await onResend();
            } finally {
              setSending(false);
            }
          }}
          className="font-semibold text-pal-text underline hover:text-pal-accent disabled:opacity-50"
        >
          {sending ? 'sending…' : 'resend the code'}
        </button>
      )}
      .
    </p>
  );
}
