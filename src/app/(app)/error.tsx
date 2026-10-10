'use client';

import { RotateCcw } from 'lucide-react';
import { EmptyState, PillButton } from '@/components/app/primitives';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      text="This page couldn't load. Check your connection and try again."
      action={
        <PillButton variant="white" icon={<RotateCcw />} onClick={reset}>
          Try again
        </PillButton>
      }
    />
  );
}
