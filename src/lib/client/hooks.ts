'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { api, fetcher } from './api';
import type { HistoryItem, Page } from './types';

export function useCurrentUser() {
  const { data, status, update } = useSession();
  return { user: data?.user ?? null, status, signedIn: status === 'authenticated', refreshSession: update };
}

/** GET an API path with SWR caching. Pass `null` to skip (e.g. while signed out). */
export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, fetcher, config);
}

/** A paginated list with "load more". `basePath` may already have query parameters. */
export function usePagedList<T>(basePath: string | null, limit = 24) {
  const { data, size, setSize, isLoading, isValidating, mutate, error } = useSWRInfinite<Page<T>>(
    (index, previous: Page<T> | null) => {
      if (!basePath || (previous && !previous.hasMore)) return null;
      return `${basePath}${basePath.includes('?') ? '&' : '?'}page=${index + 1}&limit=${limit}`;
    },
    (path: string) => api<Page<T>>(path),
  );
  return {
    items: data?.flatMap((page) => page.items) ?? [],
    hasMore: data ? data[data.length - 1].hasMore : false,
    isLoading,
    loadingMore: isValidating && size > (data?.length ?? 0),
    loadMore: () => setSize(size + 1),
    mutate,
    error,
  };
}

/** Refetch every cached request whose path contains one of the given fragments. */
export function useRevalidate() {
  const { mutate } = useSWRConfig();
  return useCallback(
    (...fragments: string[]) =>
      mutate((key) => typeof key === 'string' && fragments.some((fragment) => key.includes(fragment))),
    [mutate],
  );
}

/** Sends visitors to sign in (and back here after) before an action that needs an account. */
export function useRequireSignIn() {
  const { signedIn } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    if (signedIn) return true;
    router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
    return false;
  }, [signedIn, router, pathname]);
}

export function useUnreadCount() {
  const { signedIn } = useCurrentUser();
  const { data } = useApi<{ unreadCount: number }>(signedIn ? '/api/me/notifications?unread=true&limit=1' : null, {
    refreshInterval: 60_000,
  });
  return data?.unreadCount ?? 0;
}

/** The story the user read most recently, for the "continue reading" bars. */
export function useContinueReading() {
  const { signedIn } = useCurrentUser();
  const { data } = useApi<Page<HistoryItem>>(signedIn ? '/api/me/history?limit=1' : null);
  const item = data?.items[0];
  return item?.episode ? item : null;
}

/** A small preference kept in localStorage (best effort; falls back to the default). */
export function useStoredState<T extends string>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(saved as T);
    } catch {
      // storage unavailable
    }
  }, [key]);
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // storage unavailable
      }
    },
    [key],
  );
  return [value, update] as const;
}
