'use client';

import { useCallback, useState } from 'react';
import { PillButton } from './primitives';

type Options = { title: string; text: string; confirmLabel: string; danger?: boolean };

/**
 * `const [dialog, confirm] = useConfirm()`, render `{dialog}`, then `if (await confirm({...}))`.
 * A modal in Spotify's style instead of the browser's confirm box.
 */
export function useConfirm() {
  const [pending, setPending] = useState<(Options & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback(
    (options: Options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending && (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
      onKeyDown={(event) => event.key === 'Escape' && finish(false)}
    >
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-lg bg-pal-elevated p-6 shadow-2xl duration-150">
        <h2 id="confirm-title" className="text-2xl font-bold tracking-tight">
          {pending.title}
        </h2>
        <p className="mt-3 text-pal-subdued">{pending.text}</p>
        <div className="mt-8 flex justify-end gap-2">
          <PillButton variant="ghost" onClick={() => finish(false)} autoFocus>
            Cancel
          </PillButton>
          <PillButton variant={pending.danger ? 'danger' : 'primary'} onClick={() => finish(true)}>
            {pending.confirmLabel}
          </PillButton>
        </div>
      </div>
    </div>
  );

  return [dialog, confirm] as const;
}
