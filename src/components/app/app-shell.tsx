'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Bell, ChevronLeft, LogOut, Settings, SquarePen } from 'lucide-react';
import { useCurrentUser } from '@/lib/client/hooks';
import { UserAvatar } from './account-menu';
import { InstallAppButton } from './pwa';
import { BottomBar, MobileNav } from './bottom-bars';
import { LibrarySidebar } from './library-sidebar';
import { LogoMark, LogoName } from './logo';
import { MainScrollContext } from './main-scroll';
import { PillLink } from './primitives';
import { TopBar } from './top-bar';

const ShellContext = createContext({ openMenu: () => {} });
export const useShell = () => useContext(ShellContext);

/**
 * Spotify's layout: black frame, top bar, "Your Library" on the left, the main panel
 * (the only thing that scrolls) and a bar at the bottom. Phones get bottom tabs instead.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // New page: start at the top and close the phone menu.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    setMenuOpen(false);
  }, [pathname]);

  return (
    <ShellContext.Provider value={{ openMenu: () => setMenuOpen(true) }}>
      <MainScrollContext.Provider value={mainRef}>
        <div className="flex h-dvh flex-col bg-pal-base text-pal-text">
          <TopBar />
          <div className="flex min-h-0 flex-1 gap-2 md:px-2">
            <LibrarySidebar />
            <main
              ref={mainRef}
              id="main"
              className="scrollbar-thin relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-pal-surface pb-44 md:rounded-lg md:pb-0"
            >
              {children}
            </main>
          </div>
          <BottomBar />
          <MobileNav />
          {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
        </div>
      </MainScrollContext.Provider>
    </ShellContext.Provider>
  );
}

/** Top of a page on phones: the avatar that opens the menu, then a title or chips. */
export function MobileHeader({ title, children }: { title?: string; children?: React.ReactNode }) {
  const { openMenu } = useShell();
  const { signedIn } = useCurrentUser();
  return (
    <div className="flex items-center gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),16px)] md:hidden">
      <button type="button" onClick={openMenu} aria-label="Open menu" className="shrink-0">
        {signedIn ? <UserAvatar className="h-8 w-8 text-sm" /> : <LogoMark className="h-6" />}
      </button>
      {title && <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">{title}</h1>}
      {children}
    </div>
  );
}

/** Round back button for phone page headers (the desktop top bar has no back button). */
export function MobileBackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="grid h-8 w-8 place-items-center rounded-full bg-black/40 md:hidden"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  );
}

/** Slide-in menu on phones (Spotify opens one from the avatar). */
function MobileMenu({ onClose }: { onClose: () => void }) {
  const { user } = useCurrentUser();

  return (
    <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 md:hidden">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <nav className="animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-pal-surface px-4 pb-8 pt-[max(env(safe-area-inset-top),20px)] duration-200">
        {user ? (
          <>
            <Link href={`/u/${user.username}`} className="flex items-center gap-3 border-b border-white/10 pb-5">
              <UserAvatar className="h-12 w-12 text-xl" />
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold">{user.name ?? user.username}</span>
                <span className="block text-sm text-pal-subdued">View profile</span>
              </span>
            </Link>
            <MenuItem href="/studio" icon={<SquarePen className="h-6 w-6" />}>
              Create (Studio)
            </MenuItem>
            <MenuItem href="/notifications" icon={<Bell className="h-6 w-6" />}>
              Notifications
            </MenuItem>
            <MenuItem href="/settings" icon={<Settings className="h-6 w-6" />}>
              Settings
            </MenuItem>
            <InstallAppButton variant="menu" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-4 py-4 text-left text-lg font-semibold"
            >
              <LogOut className="h-6 w-6" /> Log out
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="mb-4 flex items-center gap-3">
              <LogoMark className="h-10" />
              <LogoName className="h-7" />
            </div>
            <p className="mb-2 text-2xl font-bold tracking-tight">Stories worth staying up for. Free to read.</p>
            <PillLink href="/sign-up" size="lg">
              Sign up free
            </PillLink>
            <PillLink href="/sign-in" variant="outline" size="lg">
              Log in
            </PillLink>
            <InstallAppButton variant="menu" className="mt-2" />
          </div>
        )}
      </nav>
    </div>
  );
}

function MenuItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-4 py-4 text-lg font-semibold">
      {icon}
      {children}
    </Link>
  );
}
