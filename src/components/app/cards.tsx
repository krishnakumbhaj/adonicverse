import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { storyKind } from '@/lib/client/format';
import type { Channel, ChannelSummary, Story } from '@/lib/client/types';
import { Avatar, Poster } from './poster';
import { cx, SectionTitle } from './primitives';

/** The round primary button, Spotify's green play button. Decorative unless given an onClick/link. */
export function ReadCircle({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-10 w-10', md: 'h-12 w-12', lg: 'h-14 w-14' };
  return (
    <span
      className={cx(
        'grid place-items-center rounded-full bg-pal-primary text-pal-on-primary shadow-[0_8px_8px_rgba(0,0,0,.3)] transition hover:scale-105 hover:bg-pal-primary-hover',
        sizes[size],
        className,
      )}
    >
      <BookOpen className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
    </span>
  );
}

/** Spotify's "now playing" equalizer, marking the episode you're on. */
export function ReadingBars() {
  return (
    <span aria-label="Reading now" className="flex h-3.5 items-end gap-[2px]">
      {[0, 0.3, 0.6].map((delay) => (
        <span
          key={delay}
          className="h-full w-[3px] origin-bottom animate-bar rounded-sm bg-pal-accent"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

/** Story card: poster, title, kind and channel. The read button slides up on hover. */
export function StoryCard({ story, subtitle }: { story: Story; subtitle?: string }) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="group block rounded-md p-2 transition-colors hover:bg-white/[.07] md:p-3"
    >
      <div className="relative mb-2 md:mb-3">
        <Poster
          story={story}
          sizes="(min-width: 768px) 200px, 45vw"
          className="aspect-[2/3] w-full rounded-md shadow-[0_8px_24px_rgba(0,0,0,.5)]"
        />
        <div
          aria-hidden
          className="absolute bottom-2 right-2 hidden translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block"
        >
          <ReadCircle />
        </div>
      </div>
      <p className="truncate text-[15px] font-bold">{story.title}</p>
      <p className="line-clamp-2 text-sm text-pal-subdued">
        {subtitle ?? `${storyKind(story.type)} · ${story.channel?.name ?? ''}`}
      </p>
    </Link>
  );
}

/** Channel card: round avatar like Spotify's artist cards. */
export function ChannelCard({ channel }: { channel: Channel | ChannelSummary }) {
  return (
    <Link href={`/channel/${channel.handle}`} className="group block rounded-md p-2 transition-colors hover:bg-white/[.07] md:p-3">
      <Avatar
        name={channel.name}
        image={channel.avatar}
        seed={channel.id}
        sizes="200px"
        className="mb-2 aspect-square w-full shadow-[0_8px_24px_rgba(0,0,0,.5)] md:mb-3"
      />
      <p className="truncate text-[15px] font-bold">{channel.name}</p>
      <p className="text-sm text-pal-subdued">Channel</p>
    </Link>
  );
}

/** Compact tile for the "recents" grid at the top of Home. */
export function QuickTile({ href, story, label }: { href: string; story: Story; label?: string }) {
  return (
    <Link
      href={href}
      className="group flex h-14 items-center gap-2 overflow-hidden rounded bg-white/[.07] pr-2 transition-colors hover:bg-white/[.16] md:h-16 md:gap-3"
    >
      <Poster story={story} showTitle={false} sizes="64px" className="h-full w-14 shadow-[0_4px_12px_rgba(0,0,0,.5)] md:w-16" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[13px] font-bold leading-tight md:text-sm">{story.title}</span>
        {label && <span className="hidden truncate text-xs text-pal-subdued md:block">{label}</span>}
      </span>
      <span aria-hidden className="hidden opacity-0 transition group-hover:opacity-100 md:block">
        <ReadCircle size="sm" />
      </span>
    </Link>
  );
}

/**
 * A titled row of cards (a Spotify "shelf"). Phones swipe through it; larger screens show
 * exactly one row of as many cards as fit (extra rows get zero height and are clipped),
 * with "Show all" for the rest.
 */
export function Shelf({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 md:mt-8">
      <SectionTitle title={title} href={href} className="px-4 md:px-6" />
      <div className="scrollbar-none flex snap-x overflow-x-auto px-2 md:grid md:auto-rows-[0] md:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] md:grid-rows-1 md:overflow-hidden md:px-3">
        {children}
      </div>
    </section>
  );
}

/** Slot for a card inside a Shelf: fixed width on phones, a grid cell on larger screens. */
export function ShelfItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[152px] shrink-0 snap-start md:w-auto">{children}</div>;
}

/** Responsive grid for "Show all" pages. */
export function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 px-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] md:px-3">
      {children}
    </div>
  );
}
