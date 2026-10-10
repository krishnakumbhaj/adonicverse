'use client';

import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { ToastProvider } from '@/components/app/toast';
import { fetcher } from '@/lib/client/api';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ fetcher, revalidateOnFocus: false, shouldRetryOnError: false }}>
        <ToastProvider>{children}</ToastProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
