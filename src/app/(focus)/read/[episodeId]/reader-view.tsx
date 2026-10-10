'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Type } from 'lucide-react';
import { ReadCircle } from '@/components/app/cards';
import { useDismiss } from '@/components/app/menu';
import { Avatar } from '@/components/app/poster';
import { cx, EmptyState, PillLink, Spinner } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { api, errorMessage } from '@/lib/client/api';
import { compactNumber, shortDate } from '@/lib/client/format';
import { useApi, useCurrentUser, useRequireSignIn, useRevalidate, useStoredState } from '@/lib/client/hooks';
import type { ReadingResponse, StoryResponse } from '@/lib/client/types';
import Comments from './comments';

const TEXT_SIZES = { s: 17, m: 19, l: 21, xl: 24 } as const;
type TextSize = keyof typeof TEXT_SIZES;

export default function ReaderView({ episodeId }: { episodeId: string }) {
  const { data, error } = useApi<ReadingResponse>(`/api/episodes/${episodeId}`);
  if (error) {
    return (
      <EmptyState
        title="Episode not found"
        text="It may have been unpublished or deleted."
        action={<PillLink href="/" variant="white">Home</PillLink>}
      />
    );
  }
  if (!data) return <Spinner className="min-h-dvh items-center" />;
  return <Reader key={episodeId} data={data} />;
}

function Reader({ data }: { data: ReadingResponse }) {
  const { episode, story, season, navigation, viewer } = data;
  const router = useRouter();
  const [size, setSize] = useStoredState<TextSize>('reader-text-size', 'm');
  const { visible, percent } = useScrollChrome();
  const isPublic = episode.status === 'published' && story.status === 'published';
  useReadingTracking(story.id, episode.id, isPublic);

  // ← → move between episodes, like turning pages.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowRight' && navigation.next) router.push(`/read/${navigation.next.id}`);
      if (event.key === 'ArrowLeft' && navigation.previous) router.push(`/read/${navigation.previous.id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigation, router]);

  const label =
    story.type === 'single'
      ? 'Short story'
      : [season?.title || null, navigation.position ? `Episode ${navigation.position} of ${navigation.total}` : null]
          .filter(Boolean)
          .join(' · ');

  return (
    <div>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-30 border-b border-white/5 backdrop-blur transition-transform duration-300',
          visible ? 'translate-y-0' : '-translate-y-full',
        )}
        style={{ backgroundColor: 'color-mix(in srgb, var(--p-surface) 90%, transparent)' }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-2 md:px-4">
          <Link href={`/story/${story.id}`} aria-label="Back to story" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs text-pal-subdued">{story.title}</p>
            <p className="truncate text-sm font-bold">{episode.title}</p>
          </div>
          <TextSizeMenu size={size} onChange={setSize} />
          <a href="#comments" aria-label="Comments" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10">
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
        <div className="h-[2px]">
          <div className="h-full bg-pal-primary transition-[width] duration-150" style={{ width: `${percent}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-5 pb-36 pt-24 md:pt-28">
        {!isPublic && (
          <p className="mb-8 rounded-md border border-pal-warning px-4 py-3 text-sm text-pal-warning">
            Preview — readers can&apos;t see this {episode.status === 'draft' ? 'episode' : 'story'} until it&apos;s published.
          </p>
        )}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pal-accent">{label}</p>
        <h1 className="mt-3 font-reading text-4xl font-semibold leading-tight md:text-5xl">{episode.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pal-subdued">
          {story.channel && (
            <Link href={`/channel/${story.channel.handle}`} className="flex items-center gap-2 font-semibold text-pal-text hover:underline">
              <Avatar name={story.channel.name} image={story.channel.avatar} seed={story.channel.id} className="h-6 w-6 text-[11px]" />
              {story.channel.name}
            </Link>
          )}
          <span>• {episode.readingMinutes || 1} min read</span>
          {episode.publishedAt && <span>• {shortDate(episode.publishedAt)}</span>}
        </div>

        {episode.content ? (
          <div
            className="story-content mt-10"
            style={{ fontSize: TEXT_SIZES[size], lineHeight: 1.8 }}
            // Sanitized on the server when it was saved (see src/lib/content.ts).
            dangerouslySetInnerHTML={{ __html: episode.content }}
          />
        ) : (
          <p className="mt-10 text-pal-subdued">This episode has no text yet.</p>
        )}

        <EndOfEpisode data={data} />
        <Comments episodeId={episode.id} total={episode.stats.comments} canModerate={Boolean(viewer?.canManage)} />
      </main>

      <footer
        className={cx(
          'fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 md:bottom-4',
          visible ? 'translate-y-0' : 'translate-y-[150%]',
        )}
      >
        <div
          className="mx-auto flex h-14 max-w-[680px] items-center justify-between border-t border-white/5 px-3 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/60 backdrop-blur md:rounded-full md:border"
          style={{ backgroundColor: 'color-mix(in srgb, var(--p-elevated) 92%, transparent)' }}
        >
          <EpisodeStep direction="previous" target={navigation.previous} />
          <LikeButton episodeId={episode.id} initialLiked={Boolean(viewer?.liked)} initialLikes={episode.stats.likes} disabled={!isPublic} />
          <EpisodeStep direction="next" target={navigation.next} />
        </div>
      </footer>
    </div>
  );
}

function EndOfEpisode({ data }: { data: ReadingResponse }) {
  const { story, navigation } = data;
  return (
    <div className="mt-16 space-y-3 font-sans">
      {navigation.next ? (
        <Link href={`/read/${navigation.next.id}`} className="group flex items-center gap-4 rounded-lg bg-white/[.07] p-5 transition-colors hover:bg-white/[.12]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-pal-subdued">Next episode</p>
            <p className="mt-1 truncate text-lg font-bold">{navigation.next.title}</p>
          </div>
          <ReadCircle />
        </Link>
      ) : (
        <div className="rounded-lg bg-white/[.07] p-6 text-center">
          <p className="text-xl font-bold">{story.type === 'series' ? "You're all caught up" : 'The end'}</p>
          <p className="mt-1 text-sm text-pal-subdued">
            {story.type === 'series'
              ? 'Save the story to your library and subscribe to the channel to hear about new episodes.'
              : 'Enjoyed it? Leave a rating so other readers can find it.'}
          </p>
          <PillLink href={`/story/${story.id}`} variant="white" size="sm" className="mt-5">
            Back to {story.type === 'series' ? 'the series' : 'the story'}
          </PillLink>
        </div>
      )}
      {navigation.previous && (
        <Link href={`/read/${navigation.previous.id}`} className="flex items-center gap-1 text-sm text-pal-subdued hover:text-pal-text">
          <ChevronLeft className="h-4 w-4" /> Previous: {navigation.previous.title}
        </Link>
      )}
    </div>
  );
}

function EpisodeStep({ direction, target }: { direction: 'previous' | 'next'; target: { id: string; title: string } | null }) {
  const Icon = direction === 'next' ? ChevronRight : ChevronLeft;
  const label = direction === 'next' ? 'Next' : 'Previous';
  if (!target) {
    return (
      <span className="flex w-24 items-center gap-1 text-sm text-pal-muted" aria-hidden>
        {direction === 'previous' && <Icon className="h-5 w-5" />}
        <span className={direction === 'next' ? 'ml-auto' : ''}>{label}</span>
        {direction === 'next' && <Icon className="h-5 w-5" />}
      </span>
    );
  }
  return (
    <Link
      href={`/read/${target.id}`}
      title={target.title}
      className={cx('flex w-24 items-center gap-1 text-sm font-semibold hover:text-pal-accent', direction === 'next' && 'justify-end')}
    >
      {direction === 'previous' && <Icon className="h-5 w-5" />}
      {label}
      {direction === 'next' && <Icon className="h-5 w-5" />}
    </Link>
  );
}

function LikeButton({
  episodeId,
  initialLiked,
  initialLikes,
  disabled,
}: {
  episodeId: string;
  initialLiked: boolean;
  initialLikes: number;
  disabled: boolean;
}) {
  const [state, setState] = useState({ liked: initialLiked, likes: initialLikes });
  const requireSignIn = useRequireSignIn();
  const { toast } = useToast();

  const toggle = async () => {
    if (!requireSignIn()) return;
    const previous = state;
    setState({ liked: !state.liked, likes: state.likes + (state.liked ? -1 : 1) });
    try {
      const result = await api<{ liked: boolean; likes: number }>(`/api/episodes/${episodeId}/like`, {
        method: previous.liked ? 'DELETE' : 'POST',
      });
      setState(result);
    } catch (error) {
      setState(previous);
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={state.liked}
      aria-label={state.liked ? 'Unlike episode' : 'Like episode'}
      className={cx(
        'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition hover:scale-105 disabled:opacity-40',
        state.liked ? 'text-pal-accent' : 'text-pal-subdued hover:text-pal-text',
      )}
    >
      <Heart className="h-6 w-6" fill={state.liked ? 'currentColor' : 'none'} />
      {compactNumber(state.likes)}
    </button>
  );
}

function TextSizeMenu({ size, onChange }: { size: TextSize; onChange: (size: TextSize) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Text size"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
      >
        <Type className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 rounded-md bg-pal-highlight p-3 shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-pal-subdued">Text size</p>
          <div className="flex items-end gap-1">
            {(Object.keys(TEXT_SIZES) as TextSize[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={size === key}
                onClick={() => onChange(key)}
                style={{ fontSize: TEXT_SIZES[key] }}
                className={cx(
                  'grid h-11 w-11 place-items-center rounded-md font-reading',
                  size === key ? 'bg-pal-text text-pal-base' : 'hover:bg-white/10',
                )}
              >
                A
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Hides the top and bottom bars while scrolling down (more room to read) and tracks progress. */
function useScrollChrome() {
  const [visible, setVisible] = useState(true);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setPercent(max > 0 ? Math.min(100, (y / max) * 100) : 100);
        if (Math.abs(y - lastY) > 8) setVisible(y < lastY || y < 80);
        lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return { visible, percent };
}

/**
 * Counts the view after 5 seconds, brings signed-in readers back to where they stopped,
 * and saves their position while they read and when they leave.
 */
function useReadingTracking(storyId: string, episodeId: string, isPublic: boolean) {
  const { signedIn } = useCurrentUser();
  const revalidate = useRevalidate();
  const story = useApi<StoryResponse>(signedIn ? `/api/stories/${storyId}` : null);
  const ready = Boolean(story.data);

  useEffect(() => {
    if (!isPublic) return;
    const timer = setTimeout(() => {
      api(`/api/episodes/${episodeId}/view`, { method: 'POST' }).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [episodeId, isPublic]);

  // Restore once, when the saved progress points at this episode.
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const progress = story.data?.viewer?.progress;
    if (progress?.episodeId === episodeId && progress.position > 0.02 && progress.position < 0.98) {
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: progress.position * max });
      });
    }
  }, [ready, story.data, episodeId]);

  // Save only after restoring, so a fresh page at the top doesn't overwrite the saved position.
  useEffect(() => {
    if (!signedIn || !ready) return;
    const position = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
    };
    const save = (keepalive = false) =>
      fetch(`/api/stories/${storyId}/progress`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ episodeId, position: Math.round(position() * 1000) / 1000 }),
        keepalive,
      }).catch(() => {});

    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const throttled = () => {
      clearTimeout(timer);
      const wait = Math.max(0, 10_000 - (Date.now() - last));
      timer = setTimeout(() => {
        last = Date.now();
        save();
      }, wait);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') save(true);
    };

    const first = setTimeout(throttled, 2000);
    window.addEventListener('scroll', throttled, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(first);
      clearTimeout(timer);
      window.removeEventListener('scroll', throttled);
      document.removeEventListener('visibilitychange', onHide);
      save(true).then(() => revalidate('/api/me/history', `/api/stories/${storyId}`));
    };
  }, [signedIn, ready, storyId, episodeId, revalidate]);
}
