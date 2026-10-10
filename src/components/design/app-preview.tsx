'use client';

import { useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Home,
  Library,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Star,
} from 'lucide-react';

// A Spotify-style mock of the story app for the /palettes and /fonts design pages. It uses only the
// `pal-*` colors and inherits the font, so it follows whatever palette and font are being previewed.
// Posters are gradients standing in for cover art.

type Story = { title: string; channel: string; kind: string; art: [string, string] };

const STORIES: Story[] = [
  { title: 'The Moon Archive', channel: 'Alice Tales', kind: 'Series', art: ['#2b1055', '#7597de'] },
  { title: 'Monsoon Letters', channel: 'Ink & Rain', kind: 'Series', art: ['#f12711', '#f5af19'] },
  { title: 'A Short Night', channel: 'Alice Tales', kind: 'Short story', art: ['#0f2027', '#2c5364'] },
  { title: 'Kingdom of Ash', channel: 'Northwind', kind: 'Series', art: ['#654ea3', '#eaafc8'] },
  { title: 'The Last Train', channel: 'Midnight Desk', kind: 'Short story', art: ['#11998e', '#38ef7d'] },
  { title: 'Paper Hearts', channel: 'Rhea Writes', kind: 'Series', art: ['#ee0979', '#ff6a00'] },
];

const EPISODES = [
  { title: 'The Door in the Stacks', reads: '12.4K', minutes: 6 },
  { title: 'Silver Stairs', reads: '10.1K', minutes: 8 },
  { title: 'The Librarian Who Never Slept', reads: '9.8K', minutes: 7 },
  { title: 'Dust of Stars', reads: '8.2K', minutes: 9 },
  { title: 'What the Moon Kept', reads: '6.9K', minutes: 11 },
];

const READING_EPISODE = 1;

function Poster({ story, className = '', showTitle = true }: { story: Story; className?: string; showTitle?: boolean }) {
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-md shadow-lg shadow-black/40 ${className}`}
      style={{ background: `linear-gradient(145deg, ${story.art[0]}, ${story.art[1]})` }}
    >
      {showTitle && (
        <span className="absolute inset-x-0 bottom-0 p-2 text-[13px] font-extrabold leading-tight text-white drop-shadow-md">
          {story.title}
        </span>
      )}
    </div>
  );
}

function ReadButton({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  return (
    <button
      type="button"
      aria-label="Start reading"
      className={`grid ${dimensions} place-items-center rounded-full bg-pal-primary text-pal-on-primary shadow-lg shadow-black/40 transition hover:scale-105 hover:bg-pal-primary-hover`}
    >
      <BookOpen className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
    </button>
  );
}

function LikeButton({ className = 'h-7 w-7' }: { className?: string }) {
  const [liked, setLiked] = useState(true);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      onClick={() => setLiked(!liked)}
      className={`transition hover:scale-105 ${liked ? 'text-pal-accent' : 'text-pal-subdued hover:text-pal-text'}`}
    >
      <Heart className={className} fill={liked ? 'currentColor' : 'none'} />
    </button>
  );
}

function Chips({ items, initial = 0 }: { items: string[]; initial?: number }) {
  const [selected, setSelected] = useState(initial);
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          aria-pressed={selected === index}
          onClick={() => setSelected(index)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selected === index ? 'bg-pal-primary text-pal-on-primary' : 'bg-pal-elevated text-pal-text hover:bg-pal-highlight'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function AppPreview() {
  const story = STORIES[0];

  return (
    <div className="grid h-[780px] grid-rows-[1fr_auto] gap-2 overflow-hidden rounded-2xl bg-pal-base p-2 ring-1 ring-pal-border">
      <div className="grid min-h-0 gap-2 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="min-h-0 overflow-y-auto rounded-lg bg-pal-surface">
          <div
            className="relative px-6 pb-6 pt-4"
            style={{ background: 'linear-gradient(180deg, var(--p-hero) 0%, var(--p-surface) 100%)' }}
          >
            <TopBar />
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end">
              <Poster story={story} showTitle={false} className="w-36 shrink-0 shadow-2xl sm:w-44" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Series</p>
                <h3 className="mt-1 text-4xl font-extrabold tracking-tight sm:text-6xl">{story.title}</h3>
                <p className="mt-3 max-w-xl text-sm text-pal-subdued">
                  A night librarian finds a door between two shelves that opens onto the moon, and a library
                  that has been waiting for her.
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-pal-primary text-[11px] font-bold text-pal-on-primary">
                    A
                  </span>
                  <span className="font-bold">{story.channel}</span>
                  <span className="text-pal-subdued">• 2 seasons, 18 episodes •</span>
                  <Star className="h-4 w-4 text-pal-rating" fill="currentColor" />
                  <span className="text-pal-subdued">4.6 (1.2K)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 px-6 py-5">
            <ReadButton />
            <LikeButton className="h-8 w-8" />
            <button
              type="button"
              aria-label="Save to library"
              className="grid h-8 w-8 place-items-center rounded-full border-2 border-pal-subdued text-pal-subdued transition hover:scale-105 hover:border-pal-text hover:text-pal-text"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" aria-label="More" className="text-pal-subdued hover:text-pal-text">
              <MoreHorizontal className="h-7 w-7" />
            </button>
            <span className="ml-auto hidden rounded-full border border-pal-border px-3 py-1 text-xs font-bold uppercase tracking-wider text-pal-subdued sm:block">
              Ongoing
            </span>
          </div>

          <div className="px-6">
            <div className="mb-3 flex gap-6 border-b border-pal-border text-sm font-bold">
              <span className="border-b-2 border-pal-accent pb-2 text-pal-text">Season 1</span>
              <span className="pb-2 text-pal-subdued">Season 2</span>
            </div>
            <div className="grid grid-cols-[32px_1fr_auto] gap-4 px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-pal-subdued sm:grid-cols-[32px_1fr_90px_60px]">
              <span>#</span>
              <span>Episode</span>
              <span className="hidden sm:block">Reads</span>
              <Clock className="h-4 w-4 justify-self-end" />
            </div>
            <ol>
              {EPISODES.map((episode, index) => {
                const current = index === READING_EPISODE;
                return (
                  <li
                    key={episode.title}
                    className="group grid cursor-pointer grid-cols-[32px_1fr_auto] items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-pal-highlight sm:grid-cols-[32px_1fr_90px_60px]"
                  >
                    <span className={`tabular-nums ${current ? 'text-pal-accent' : 'text-pal-subdued'}`}>
                      {current ? <ReadingBars /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate font-medium ${current ? 'text-pal-accent' : 'text-pal-text'}`}>
                        {episode.title}
                      </span>
                      <span className="block text-xs text-pal-subdued">
                        {index === 0 ? 'Free preview • ' : ''}Mar {index + 3}
                      </span>
                    </span>
                    <span className="hidden text-sm text-pal-subdued sm:block">{episode.reads}</span>
                    <span className="justify-self-end text-sm tabular-nums text-pal-subdued">{episode.minutes} min</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="px-6 pb-8 pt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h4 className="text-2xl font-bold tracking-tight">Continue reading</h4>
              <Chips items={['All', 'Fantasy', 'Romance', 'Mystery']} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {STORIES.slice(1).map((item) => (
                <div key={item.title} className="group rounded-lg p-3 transition-colors hover:bg-pal-elevated">
                  <div className="relative">
                    <Poster story={item} />
                    <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                      <ReadButton size="sm" />
                    </div>
                  </div>
                  <p className="mt-3 truncate font-semibold">{item.title}</p>
                  <p className="truncate text-sm text-pal-subdued">
                    {item.kind} • {item.channel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <NowReadingBar story={story} />
    </div>
  );
}

function TopBar() {
  return (
    <div className="flex items-center gap-3">
      {[ChevronLeft, ChevronRight].map((Icon, index) => (
        <span key={index} className="hidden h-8 w-8 place-items-center rounded-full bg-pal-base text-pal-text sm:grid">
          <Icon className="h-5 w-5" />
        </span>
      ))}
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-pal-elevated px-4 py-2.5 text-sm text-pal-subdued ring-pal-text focus-within:ring-2 sm:max-w-sm">
        <Search className="h-4 w-4 shrink-0" />
        <input
          aria-label="Search stories"
          placeholder="Stories, channels, tags…"
          className="min-w-0 flex-1 bg-transparent text-pal-text outline-none placeholder:text-pal-subdued"
        />
      </div>
      <span className="relative ml-auto grid h-9 w-9 place-items-center rounded-full bg-pal-base text-pal-subdued">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-pal-primary ring-2 ring-pal-base" />
      </span>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-pal-base p-1">
        <span className="grid h-full w-full place-items-center rounded-full bg-pal-accent text-sm font-bold text-pal-base">B</span>
      </span>
    </div>
  );
}

function Sidebar() {
  const library = [
    ...STORIES.slice(0, 4).map((story) => ({ type: 'story' as const, story })),
    { type: 'channel' as const, name: 'Ink & Rain', color: '#f5af19' },
    { type: 'channel' as const, name: 'Northwind', color: '#7597de' },
  ];

  return (
    <aside className="hidden min-h-0 flex-col gap-2 lg:flex">
      <nav className="space-y-1 rounded-lg bg-pal-surface p-3">
        <span className="flex items-center gap-4 rounded-md px-3 py-2 font-bold text-pal-text">
          <Home className="h-6 w-6" /> Home
        </span>
        <span className="flex items-center gap-4 rounded-md px-3 py-2 font-bold text-pal-subdued transition-colors hover:text-pal-text">
          <Search className="h-6 w-6" /> Search
        </span>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-pal-surface p-3">
        <div className="flex items-center justify-between px-3 py-2 text-pal-subdued">
          <span className="flex items-center gap-3 font-bold transition-colors hover:text-pal-text">
            <Library className="h-6 w-6" /> Your Library
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-pal-elevated hover:text-pal-text">
            <Plus className="h-5 w-5" />
          </span>
        </div>
        <div className="px-3 py-2">
          <Chips items={['Stories', 'Channels']} initial={-1} />
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {library.map((item, index) => (
            <li
              key={item.type === 'story' ? item.story.title : item.name}
              className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-pal-elevated"
            >
              {item.type === 'story' ? (
                <>
                  <Poster story={item.story} showTitle={false} className="w-11 shrink-0 rounded" />
                  <span className="min-w-0">
                    <span className={`block truncate font-medium ${index === 0 ? 'text-pal-accent' : ''}`}>
                      {item.story.title}
                    </span>
                    <span className="block truncate text-sm text-pal-subdued">
                      {item.story.kind} • {item.story.channel}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-black"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-sm text-pal-subdued">Channel</span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function NowReadingBar({ story }: { story: Story }) {
  return (
    <footer className="flex items-center justify-between gap-4 px-2 py-1">
      <div className="flex min-w-0 items-center gap-3 sm:w-[30%]">
        <Poster story={story} showTitle={false} className="w-10 shrink-0 rounded" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{EPISODES[READING_EPISODE].title}</p>
          <p className="truncate text-xs text-pal-subdued">
            {story.title} • S1 E{READING_EPISODE + 1}
          </p>
        </div>
        <LikeButton className="h-5 w-5" />
      </div>

      <div className="hidden max-w-xl flex-1 flex-col items-center gap-1.5 sm:flex">
        <div className="flex items-center gap-5 text-pal-subdued">
          <SkipBack className="h-5 w-5 transition-colors hover:text-pal-text" fill="currentColor" />
          <span className="grid h-8 w-8 place-items-center rounded-full bg-pal-text text-pal-base transition hover:scale-105">
            <BookOpen className="h-4 w-4" />
          </span>
          <SkipForward className="h-5 w-5 transition-colors hover:text-pal-text" fill="currentColor" />
        </div>
        <div className="group flex w-full items-center gap-2 text-xs tabular-nums text-pal-subdued">
          <span>40%</span>
          <span className="relative h-1 flex-1 rounded-full bg-pal-highlight">
            <span className="absolute inset-y-0 left-0 w-[40%] rounded-full bg-pal-text transition-colors group-hover:bg-pal-primary" />
          </span>
          <span>5 min left</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-pal-subdued sm:w-[30%]">
        <List className="h-5 w-5 transition-colors hover:text-pal-text" />
        <span className="hidden text-xs lg:block">Up next: The Librarian Who Never Slept</span>
      </div>
    </footer>
  );
}

function ReadingBars() {
  return (
    <span aria-label="Reading now" className="flex h-4 items-end gap-[2px]">
      {[60, 100, 40].map((height) => (
        <span key={height} className="w-[3px] rounded-sm bg-pal-accent" style={{ height: `${height}%` }} />
      ))}
    </span>
  );
}

export function ComponentShowcase() {
  const [notifications, setNotifications] = useState(true);
  const [rating, setRating] = useState(4);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-full bg-pal-primary px-6 py-3 font-bold text-pal-on-primary transition hover:scale-[1.03] hover:bg-pal-primary-hover"
          >
            Start reading
          </button>
          <button
            type="button"
            className="rounded-full border border-pal-muted px-5 py-2.5 font-bold transition hover:scale-[1.03] hover:border-pal-text"
          >
            Subscribe
          </button>
          <button type="button" className="rounded-full bg-pal-text px-5 py-2.5 font-bold text-pal-base transition hover:scale-[1.03]">
            Sign up free
          </button>
          <button type="button" className="px-2 py-2.5 font-bold text-pal-subdued transition hover:text-pal-text">
            Log in
          </button>
          <ReadButton size="sm" />
        </div>
      </Card>

      <Card title="Genres and tags">
        <Chips items={['Romance', 'Fantasy', 'Mystery', 'Horror', 'Sci-fi', 'Drama']} initial={1} />
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {['#slow-burn', '#magic', '#found-family'].map((tag) => (
            <span key={tag} className="font-medium text-pal-accent hover:underline">
              {tag}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Inputs">
        <div className="flex items-center gap-2 rounded-md bg-pal-elevated px-3 py-2.5 ring-pal-text focus-within:ring-2">
          <Search className="h-4 w-4 text-pal-subdued" />
          <input
            aria-label="Search"
            placeholder="What do you want to read?"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-pal-subdued"
          />
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-between text-sm">
          <span>New episode alerts</span>
          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            onClick={() => setNotifications(!notifications)}
            className={`relative h-6 w-11 rounded-full transition-colors ${notifications ? 'bg-pal-primary' : 'bg-pal-highlight'}`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-pal-text transition-all ${notifications ? 'left-6' : 'left-1'}`}
            />
          </button>
        </label>
      </Card>

      <Card title="Reading progress">
        <div className="space-y-3 text-sm">
          {[
            { label: 'Season 1', value: 100 },
            { label: 'Season 2', value: 35 },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-pal-subdued">
                <span>{label}</span>
                <span className="tabular-nums">{value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-pal-highlight">
                <div className="h-full rounded-full bg-pal-primary" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Rating and badges">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} stars`}
              onClick={() => setRating(value)}
              className={value <= rating ? 'text-pal-rating' : 'text-pal-highlight'}
            >
              <Star className="h-7 w-7" fill="currentColor" />
            </button>
          ))}
          <span className="ml-2 text-sm text-pal-subdued">{rating}.0</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className="rounded bg-pal-primary px-2 py-1 text-pal-on-primary">New episode</span>
          <span className="rounded bg-pal-elevated px-2 py-1 text-pal-subdued">Completed</span>
          <span className="rounded border border-pal-danger px-2 py-1 text-pal-danger">Mature</span>
        </div>
      </Card>

      <Card title="Status messages">
        <ul className="space-y-2 text-sm">
          <li className="rounded-md bg-pal-elevated px-3 py-2">
            <span className="font-semibold text-pal-success">Published.</span> Episode 4 is live.
          </li>
          <li className="rounded-md bg-pal-elevated px-3 py-2">
            <span className="font-semibold text-pal-warning">Draft.</span> 3 episodes not published yet.
          </li>
          <li className="rounded-md bg-pal-elevated px-3 py-2">
            <span className="font-semibold text-pal-danger">Couldn&apos;t save.</span> Check your connection.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-pal-surface p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-pal-subdued">{title}</h3>
      {children}
    </div>
  );
}
