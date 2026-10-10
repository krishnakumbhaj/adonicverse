'use client';

import { createContext, useContext, useEffect, useState, type RefObject } from 'react';

// The main panel is the scroll container (like Spotify), not the window. Pages use this to
// react to scrolling, e.g. to show a sticky title bar once the big header is out of view.

export const MainScrollContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function useMainScrollTop() {
  const ref = useContext(MainScrollContext);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const element = ref?.current;
    if (!element) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrollTop(element.scrollTop));
    };
    onScroll();
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', onScroll);
    };
  }, [ref]);

  return scrollTop;
}

/** Scroll the main panel back to the top, e.g. after navigating. */
export function useScrollMainToTop() {
  const ref = useContext(MainScrollContext);
  return () => ref?.current?.scrollTo({ top: 0 });
}
