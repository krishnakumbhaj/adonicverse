'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useCallback, useRef, useState } from 'react';
import { useCurrentUser } from '@/lib/client/hooks';
import { useDismiss } from './menu';
import { Avatar } from './poster';
import { InstallAppButton } from './pwa';

/** The avatar button at the top right and its dropdown, like Spotify's account menu. */
export function AccountMenu() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid h-12 w-12 place-items-center rounded-full bg-pal-elevated transition hover:scale-105"
      >
        <UserAvatar className="h-8 w-8 text-sm" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md bg-pal-highlight p-1 text-sm shadow-[0_16px_24px_rgba(0,0,0,.3),0_6px_8px_rgba(0,0,0,.2)]"
        >
          <MenuLink href={`/u/${user.username}`} onClick={close}>
            Profile
          </MenuLink>
          <MenuLink href="/studio" onClick={close}>
            Studio
          </MenuLink>
          <MenuLink href="/notifications" onClick={close}>
            Notifications
          </MenuLink>
          <MenuLink href="/settings" onClick={close}>
            Settings
          </MenuLink>
          <InstallAppButton variant="dropdown" onSelect={close} />
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full rounded-sm px-3 py-3 text-left hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="block rounded-sm px-3 py-3 hover:bg-white/10">
      {children}
    </Link>
  );
}

/** The signed-in user's avatar from the session. */
export function UserAvatar({ className }: { className?: string }) {
  const { user } = useCurrentUser();
  if (!user) return null;
  return (
    <Avatar
      name={user.name ?? user.username}
      image={user.image ? { url: user.image, width: 0, height: 0 } : null}
      seed={user.id}
      className={className}
    />
  );
}
