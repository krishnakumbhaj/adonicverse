'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Bell, House, LayoutGrid, Search } from 'lucide-react';
import { useCurrentUser, useUnreadCount } from '@/lib/client/hooks';
import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { cx, PillLink } from './primitives';
import { InstallAppButton } from './pwa';

const SEARCH_PLACEHOLDER = 'What do you want to read?';

/** Desktop and tablet top bar: logo, Home + search in the middle, account on the right. */
export function TopBar() {
  const pathname = usePathname();
  const { signedIn, status } = useCurrentUser();
  const unread = useUnreadCount();
  const onHome = pathname === '/';

  return (
    <header className="hidden h-16 shrink-0 items-center gap-4 px-4 md:flex">
      <div className="flex w-1/4 min-w-0 items-center lg:w-[30%]">
        <Logo />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <Link
          href="/"
          aria-label="Home"
          title="Home"
          className={cx(
            'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pal-elevated transition hover:scale-105',
            onHome ? 'text-pal-text' : 'text-pal-subdued hover:text-pal-text',
          )}
        >
          <House className="h-6 w-6" fill={onHome ? 'currentColor' : 'none'} />
        </Link>
        <Suspense fallback={<SearchShell />}>
          <SearchBox />
        </Suspense>
      </div>

      <div className="flex w-1/4 items-center justify-end gap-2 lg:w-[30%]">
        {/* Logged-in people find "Install App" in the profile dropdown instead. */}
        {status === 'unauthenticated' && <InstallAppButton className="mr-2 hidden lg:flex" />}
        {status === 'loading' ? null : signedIn ? (
          <>
            <PillLink href="/studio" variant="white" size="sm" className="hidden lg:inline-flex">
              Create
            </PillLink>
            <Link
              href="/notifications"
              aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
              title="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full text-pal-subdued transition hover:scale-105 hover:text-pal-text"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-pal-primary ring-2 ring-pal-base" />
              )}
            </Link>
            <AccountMenu />
          </>
        ) : (
          <>
            <Link
              href="/sign-up"
              className="hidden whitespace-nowrap px-4 font-bold text-pal-subdued transition hover:scale-105 hover:text-pal-text lg:block"
            >
              Sign up
            </Link>
            <PillLink href="/sign-in" variant="white" size="lg">
              Log in
            </PillLink>
          </>
        )}
      </div>
    </header>
  );
}

/** Search input that searches as you type, like Spotify's. Lives in the top bar on every page. */
function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearch = pathname === '/search';
  const [value, setValue] = useState(onSearch ? (params.get('q') ?? '') : '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in sync when the URL changes (back/forward, or leaving search), without
  // fighting the user's typing (the URL holds the trimmed text).
  useEffect(() => {
    const q = onSearch ? (params.get('q') ?? '') : '';
    setValue((current) => (current.trim() === q ? current : q));
  }, [onSearch, params]);

  const go = (text: string) => {
    const q = text.trim();
    const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
    if (onSearch) router.replace(url);
    else router.push(url);
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        go(value);
      }}
      className="group relative w-full max-w-[480px]"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-pal-subdued group-focus-within:text-pal-text" />
      <input
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          clearTimeout(timer.current);
          const text = event.target.value;
          timer.current = setTimeout(() => go(text), 300);
        }}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label="Search stories and channels"
        className="h-12 w-full rounded-full bg-pal-elevated pl-12 pr-16 text-base text-pal-text outline-none transition placeholder:text-pal-subdued hover:bg-pal-highlight hover:ring-1 hover:ring-white/10 focus:ring-2 focus:ring-pal-text [&::-webkit-search-cancel-button]:hidden"
      />
      <Link
        href="/search"
        aria-label="Browse"
        title="Browse"
        className="absolute right-0 top-1/2 flex h-8 -translate-y-1/2 items-center border-l border-pal-muted px-4 text-pal-subdued hover:text-pal-text"
      >
        <LayoutGrid className="h-5 w-5" />
      </Link>
    </form>
  );
}

function SearchShell() {
  return (
    <div className="relative h-12 w-full max-w-[480px] rounded-full bg-pal-elevated">
      <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-pal-subdued" />
      <span className="absolute left-12 top-1/2 -translate-y-1/2 text-pal-subdued">{SEARCH_PLACEHOLDER}</span>
    </div>
  );
}
