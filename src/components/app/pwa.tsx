'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { CircleArrowDown } from 'lucide-react';
import { cx } from './primitives';

/** Chrome/Edge's install offer (`beforeinstallprompt`). Safari has none: people use Share → Add to Home Screen. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Kept outside React because the offer often arrives before the top bar has mounted.
let installPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
function setInstallPrompt(event: InstallPromptEvent | null) {
  installPrompt = event;
  listeners.forEach((listener) => listener());
}

/**
 * Registers the service worker (public/sw.js) and catches the browser's install offer.
 * Rendered once in the root layout.
 */
export function PwaSetup() {
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault(); // show our own "Install App" button instead of the browser's banner
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker not registered', error));
      } else {
        // In development its cache would hide code changes, so drop any worker a production build left here.
        void navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((r) => r.unregister()));
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}

function useInstallPrompt() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => installPrompt,
    () => null,
  );
}

const VARIANTS = {
  // The top bar, like the link in Spotify's top bar (shown to visitors who aren't logged in).
  bar: 'flex items-center gap-2 whitespace-nowrap text-sm font-bold text-pal-subdued transition hover:scale-105 hover:text-pal-text',
  // A row in the profile dropdown.
  dropdown: 'flex w-full items-center justify-between gap-3 rounded-sm px-3 py-3 text-left hover:bg-white/10',
  // A row in the phone menu.
  menu: 'flex items-center gap-4 py-4 text-left text-lg font-semibold',
};

/**
 * "Install App". Only shows while the browser offers to install (not when already installed,
 * and not in Safari). `onSelect` runs first, e.g. to close the dropdown it sits in.
 */
export function InstallAppButton({
  variant = 'bar',
  className,
  onSelect,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  onSelect?: () => void;
}) {
  const prompt = useInstallPrompt();
  if (!prompt) return null;

  const install = async () => {
    onSelect?.();
    await prompt.prompt();
    await prompt.userChoice;
    setInstallPrompt(null); // an offer can only be used once; the browser sends a new one later
  };

  const icon = <CircleArrowDown className={variant === 'menu' ? 'h-6 w-6' : variant === 'bar' ? 'h-5 w-5' : 'h-4 w-4'} />;
  return (
    <button type="button" role={variant === 'dropdown' ? 'menuitem' : undefined} onClick={install} className={cx(VARIANTS[variant], className)}>
      {variant !== 'dropdown' && icon}
      Install App
      {variant === 'dropdown' && icon}
    </button>
  );
}
