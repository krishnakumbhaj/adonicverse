'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Check, Clock, Plus } from 'lucide-react';
import { languageName } from '@/config/content';
import { MobileBackButton } from '@/components/app/app-shell';
import { ReadCircle, ReadingBars } from '@/components/app/cards';
import { genreName } from '@/components/app/genre-art';
import { useMainScrollTop } from '@/components/app/main-scroll';
import { Markdown } from '@/components/app/markdown';
import { MoreMenu } from '@/components/app/menu';
import { Avatar, Poster } from '@/components/app/poster';
import { Badge, Chip, ChipRow, cx, EmptyState, PillLink, Spinner } from '@/components/app/primitives';
import { StoryShelf } from '@/components/app/shelves';
import { SubscribeButton } from '@/components/app/subscribe-button';
import { useToast } from '@/components/app/toast';
import { api, errorMessage } from '@/lib/client/api';
import { useDominantColor } from '@/lib/client/colors';
import { compactNumber, plural, shortDate, storyKind } from '@/lib/client/format';
import { useApi, useRequireSignIn, useRevalidate } from '@/lib/client/hooks';
import type { ChannelResponse, Episode, StoryResponse, TableOfContents } from '@/lib/client/types';
import { markdownToPlainText } from '@/lib/markdown';
import StoryReviews from './story-reviews';

export default function StoryView({ storyId }: { storyId: string }) {
  const story = useApi<StoryResponse>(`/api/stories/${storyId}`);
  const toc = useApi<TableOfContents>(`/api/stories/${storyId}/episodes`);

  if (story.error) {
    return (
      <EmptyState
        title="Story not found"
        text="It may have been unpublished or deleted."
        action={<PillLink href="/" variant="white">Home</PillLink>}
      />
    );
  }
  if (!story.data) return <Spinner />;
  return <StoryPage data={story.data} toc={toc.data} refresh={() => story.mutate()} />;
}

function StoryPage({ data, toc, refresh }: { data: StoryResponse; toc?: TableOfContents; refresh: () => void }) {
  const { story, viewer } = data;
  const color = useDominantColor(story.poster?.url, story.id);
  const scrolled = useMainScrollTop() > 300;
  const [seasonId, setSeasonId] = useState<string | null>(null);

  const seasons = toc?.seasons ?? [];
  const allEpisodes = story.type === 'series' ? seasons.flatMap((season) => season.episodes) : (toc?.episodes ?? []);
  const resumeId = viewer?.progress?.episodeId;
  const firstEpisode = allEpisodes.find((episode) => episode.status === 'published') ?? allEpisodes[0];
  const readHref = resumeId ? `/read/${resumeId}` : firstEpisode ? `/read/${firstEpisode.id}` : null;
  const readLabel = resumeId ? 'Continue reading' : 'Start reading';

  const activeSeason =
    seasons.find((season) => season.id === seasonId) ??
    seasons.find((season) => season.episodes.some((episode) => episode.id === resumeId)) ??
    seasons[0];
  const listed = story.type === 'series' ? (activeSeason?.episodes ?? []) : (toc?.episodes ?? []);

  const meta = [
    story.type === 'series'
      ? `${plural(story.stats.seasons || 1, 'season')}, ${plural(story.stats.episodes, 'episode')}`
      : `${Math.max(1, Math.ceil(story.stats.words / 200))} min read`,
    story.rating.count > 0 ? `★ ${story.rating.average.toFixed(1)} (${compactNumber(story.rating.count)})` : null,
    story.stats.views > 0 ? plural(story.stats.views, 'read') : null,
  ].filter(Boolean);

  return (
    <div className="relative">
      {/* Spotify's sticky bar: appears once the big header scrolls away. */}
      <div
        className={cx(
          'sticky top-0 z-20 -mb-16 flex h-16 items-center gap-3 px-4 transition-opacity duration-200 md:px-6',
          scrolled ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ backgroundColor: `color-mix(in srgb, ${color} 60%, black)` }}
      >
        {readHref && (
          <Link href={readHref} aria-label={readLabel} tabIndex={scrolled ? 0 : -1}>
            <ReadCircle size="sm" />
          </Link>
        )}
        <span className="truncate text-xl font-bold md:text-2xl">{story.title}</span>
      </div>

      <header style={{ backgroundColor: color }} className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
        <div className="relative flex flex-col gap-5 px-4 pb-6 pt-[max(env(safe-area-inset-top),12px)] md:flex-row md:items-end md:gap-6 md:px-6 md:pt-20">
          <MobileBackButton />
          <Poster
            story={story}
            priority
            sizes="(min-width: 1024px) 232px, (min-width: 768px) 192px, 56vw"
            className="mx-auto aspect-[2/3] w-[56%] max-w-[240px] rounded-md shadow-[0_4px_60px_rgba(0,0,0,.5)] md:mx-0 md:w-[192px] lg:w-[232px]"
          />
          <div className="min-w-0">
            <p className="hidden text-sm font-semibold md:block">{storyKind(story.type)}</p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight md:mt-2 md:text-[clamp(32px,5vw,72px)] md:font-black md:leading-[1.05]">
              {story.title}
            </h1>
            {story.synopsis && (
              <div className="mt-3 hidden md:block">
                <p className="line-clamp-2 max-w-3xl text-sm text-white/70">{markdownToPlainText(story.synopsis)}</p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
              {story.channel && (
                <Link href={`/channel/${story.channel.handle}`} className="flex items-center gap-1.5 font-bold hover:underline">
                  <Avatar name={story.channel.name} image={story.channel.avatar} seed={story.channel.id} className="h-6 w-6 text-[11px]" />
                  {story.channel.name}
                </Link>
              )}
              {meta.map((part) => (
                <span key={part} className="text-white/70">
                  • {part}
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2 md:hidden">
              <Badge>{storyKind(story.type)}</Badge>
              {story.status === 'draft' && <Badge tone="warning">Draft</Badge>}
            </div>
          </div>
        </div>
      </header>

      <div style={{ background: `linear-gradient(color-mix(in srgb, ${color} 30%, var(--p-surface)), var(--p-surface) 232px)` }}>
        <ActionBar data={data} readHref={readHref} readLabel={readLabel} refresh={refresh} />

        {story.type === 'series' && seasons.length > 1 && (
          <ChipRow className="px-4 pb-4 md:px-6">
            {seasons.map((season, index) => (
              <Chip key={season.id} selected={season.id === activeSeason?.id} onClick={() => setSeasonId(season.id)}>
                {season.title || `Season ${index + 1}`}
              </Chip>
            ))}
          </ChipRow>
        )}
        {toc ? <EpisodeList episodes={listed} resumeId={resumeId} /> : <Spinner className="py-8" />}

        <About data={data} />
        <StoryReviews story={story} viewer={viewer} onChanged={refresh} />
        {story.channel && (
          <StoryShelf
            title={`More from ${story.channel.name}`}
            path={`/api/channels/${story.channel.handle}/stories?sort=popular&limit=12`}
            href={`/channel/${story.channel.handle}`}
            exclude={story.id}
          />
        )}
        <div className="h-10" />
      </div>
    </div>
  );
}

function ActionBar({
  data,
  readHref,
  readLabel,
  refresh,
}: {
  data: StoryResponse;
  readHref: string | null;
  readLabel: string;
  refresh: () => void;
}) {
  const { story, viewer } = data;
  const [saved, setSaved] = useState(Boolean(viewer?.inLibrary));
  const requireSignIn = useRequireSignIn();
  const revalidate = useRevalidate();
  const { toast } = useToast();

  const toggleSave = async () => {
    if (!requireSignIn()) return;
    const next = !saved;
    setSaved(next);
    try {
      await api(`/api/stories/${story.id}/library`, { method: next ? 'POST' : 'DELETE' });
      toast(next ? 'Saved to Your Library' : 'Removed from Your Library');
      revalidate('/api/me/library');
      refresh();
    } catch (error) {
      setSaved(!next);
      toast(errorMessage(error), 'error');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/story/${story.id}`);
      toast('Link copied to clipboard');
    } catch {
      toast("Couldn't copy the link", 'error');
    }
  };

  return (
    <div className="flex items-center gap-5 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      {readHref && (
        <Link href={readHref} aria-label={readLabel} title={readLabel} className="order-last ml-auto md:order-first md:ml-0">
          <ReadCircle size="lg" />
        </Link>
      )}
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from Your Library' : 'Save to Your Library'}
        title={saved ? 'Remove from Your Library' : 'Save to Your Library'}
        className={cx(
          'grid h-8 w-8 place-items-center rounded-full transition hover:scale-105',
          saved ? 'bg-pal-primary text-pal-on-primary' : 'border-2 border-pal-subdued text-pal-subdued hover:border-pal-text hover:text-pal-text',
        )}
      >
        {saved ? <Check className="h-5 w-5" strokeWidth={3} /> : <Plus className="h-4 w-4" strokeWidth={3} />}
      </button>
      {viewer?.canManage && (
        <PillLink href={`/studio/story/${story.id}`} variant="outline" size="sm">
          Edit
        </PillLink>
      )}
      {story.status === 'draft' && (
        <span className="hidden md:inline">
          <Badge tone="warning">Draft — only you can see this</Badge>
        </span>
      )}
      <MoreMenu
        items={[
          { label: 'Copy link', onSelect: copyLink },
          ...(story.channel ? [{ label: 'Go to channel', href: `/channel/${story.channel.handle}` }] : []),
          ...(viewer?.canManage ? [{ label: 'Manage in Studio', href: `/studio/story/${story.id}` }] : []),
        ]}
      />
    </div>
  );
}

function EpisodeList({ episodes, resumeId }: { episodes: Episode[]; resumeId?: string }) {
  if (episodes.length === 0) {
    return <p className="px-4 pb-6 text-pal-subdued md:px-6">No episodes yet. Check back soon.</p>;
  }

  return (
    <section className="px-2 md:px-6">
      <div className="hidden grid-cols-[24px_minmax(0,1fr)_120px_80px_64px] gap-4 border-b border-white/10 px-4 pb-2 text-sm text-pal-subdued md:grid">
        <span className="text-right">#</span>
        <span>Title</span>
        <span>Published</span>
        <span>Reads</span>
        <Clock className="h-4 w-4 justify-self-end" aria-label="Reading time" />
      </div>
      <ol className="md:mt-2">
        {episodes.map((episode, index) => {
          const current = episode.id === resumeId;
          return (
            <li key={episode.id}>
              <Link
                href={`/read/${episode.id}`}
                className="group grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md px-2 py-2 transition-colors hover:bg-white/10 md:grid-cols-[24px_minmax(0,1fr)_120px_80px_64px] md:px-4"
              >
                <span className="hidden justify-self-end text-pal-subdued tabular-nums md:block">
                  {current ? (
                    <ReadingBars />
                  ) : (
                    <>
                      <span className="group-hover:hidden">{index + 1}</span>
                      <BookOpen className="hidden h-4 w-4 text-pal-text group-hover:block" />
                    </>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={cx('flex items-center gap-2 font-medium', current && 'text-pal-accent')}>
                    <span className="truncate">{episode.title}</span>
                    {episode.status === 'draft' && <Badge tone="warning">Draft</Badge>}
                  </span>
                  <span className="block text-sm text-pal-subdued md:hidden">
                    {[shortDate(episode.publishedAt), `${episode.readingMinutes} min`].filter(Boolean).join(' • ')}
                  </span>
                </span>
                <span className="hidden text-sm text-pal-subdued md:block">{shortDate(episode.publishedAt)}</span>
                <span className="hidden text-sm text-pal-subdued md:block">{compactNumber(episode.stats.views)}</span>
                <span className="justify-self-end text-sm text-pal-subdued tabular-nums">
                  <span className="hidden md:inline">{episode.readingMinutes} min</span>
                  <BookOpen className="h-5 w-5 md:hidden" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function About({ data }: { data: StoryResponse }) {
  const { story } = data;
  const channel = useApi<ChannelResponse>(story.channel ? `/api/channels/${story.channel.handle}` : null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const isSubscribed = subscribed ?? Boolean(channel.data?.viewer?.subscribed);

  const facts = [
    { label: 'Status', value: story.type === 'series' ? story.progress[0].toUpperCase() + story.progress.slice(1) : 'Complete' },
    { label: 'Language', value: languageName(story.language) },
    { label: 'Rated', value: story.contentRating === 'general' ? 'Everyone' : story.contentRating === 'teen' ? 'Teen' : 'Mature' },
    { label: 'Length', value: plural(story.stats.words, 'word') },
  ];

  return (
    <section className="mt-10 px-4 md:px-6">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">About</h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-lg bg-white/[.07] p-5">
          {story.synopsis ? (
            <Markdown text={story.synopsis} className="leading-relaxed" />
          ) : (
            <p className="text-pal-subdued">No synopsis yet.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {story.genres.map((genre) => (
              <Link
                key={genre}
                href={`/genre/${genre}`}
                className="rounded-full border border-pal-muted px-3 py-1 text-sm font-semibold transition hover:scale-105 hover:border-pal-text"
              >
                {genreName(genre)}
              </Link>
            ))}
          </div>
          {story.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {story.tags.map((tag) => (
                <Link key={tag} href={`/browse?tag=${encodeURIComponent(tag)}`} className="text-pal-accent hover:underline">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-pal-subdued">{fact.label}</dt>
                <dd className="font-semibold">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {story.channel && (
          <div className="flex items-center gap-4 self-start rounded-lg bg-white/[.07] p-5">
            <Link href={`/channel/${story.channel.handle}`} className="shrink-0">
              <Avatar name={story.channel.name} image={story.channel.avatar} seed={story.channel.id} sizes="64px" className="h-16 w-16 text-2xl" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/channel/${story.channel.handle}`} className="block truncate font-bold hover:underline">
                {story.channel.name}
              </Link>
              <p className="text-sm text-pal-subdued">
                {channel.data ? plural(channel.data.channel.stats.subscribers, 'subscriber') : 'Channel'}
              </p>
            </div>
            {!channel.data?.viewer?.canManage && (
              <SubscribeButton
                handle={story.channel.handle}
                subscribed={isSubscribed}
                size="sm"
                onChange={(next) => {
                  setSubscribed(next);
                  channel.mutate();
                }}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
