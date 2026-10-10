'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Ellipsis } from 'lucide-react';
import { cx, IconButton } from './primitives';

/** Closes a popup on outside click or Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}

export type MenuItem = { label: string; href?: string; onSelect?: () => void; danger?: boolean };

/** The "…" button and its dropdown, styled like Spotify's context menus. */
export function MoreMenu({
  items,
  label = 'More options',
  align = 'left',
  size = 'md',
}: {
  items: MenuItem[];
  label?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <IconButton label={label} size={size} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Ellipsis className={size === 'md' ? 'h-7 w-7' : 'h-5 w-5'} />
      </IconButton>
      {open && (
        <div
          role="menu"
          className={cx(
            'absolute top-full z-50 mt-1 w-56 rounded-md bg-pal-highlight p-1 text-sm shadow-[0_16px_24px_rgba(0,0,0,.3),0_6px_8px_rgba(0,0,0,.2)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => {
            const className = cx(
              'block w-full rounded-sm px-3 py-3 text-left hover:bg-white/10',
              item.danger && 'text-pal-danger',
            );
            return item.href ? (
              <Link key={item.label} href={item.href} role="menuitem" className={className} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={className}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
