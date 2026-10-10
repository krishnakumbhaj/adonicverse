import Image from 'next/image';
import { seedColor, seedGradient } from '@/lib/client/colors';
import type { Image as ImageData } from '@/lib/client/types';
import { cx } from './primitives';

type PosterProps = {
  story: { id: string; title: string; poster: ImageData | null };
  /** Size and shape, e.g. "w-full aspect-[2/3] rounded-md". */
  className?: string;
  /** Width the poster is displayed at, for image optimization. */
  sizes?: string;
  /** Print the title on the placeholder when there's no poster. */
  showTitle?: boolean;
  priority?: boolean;
};

/** A story poster, or a colorful placeholder with the title when the story has none. */
export function Poster({ story, className, sizes = '200px', showTitle = true, priority }: PosterProps) {
  return (
    <div
      className={cx('relative shrink-0 overflow-hidden bg-pal-elevated [container-type:inline-size]', className)}
      style={story.poster ? undefined : { background: seedGradient(story.id) }}
    >
      {story.poster ? (
        <Image src={story.poster.url} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        showTitle && (
          <span className="absolute inset-x-0 bottom-0 line-clamp-3 p-[8%] text-[clamp(9px,12cqw,22px)] font-extrabold leading-tight text-white drop-shadow-md">
            {story.title}
          </span>
        )
      )}
    </div>
  );
}

type AvatarProps = {
  name: string;
  image: ImageData | null;
  seed: string;
  className?: string;
  sizes?: string;
};

/** Round avatar for channels and users, falling back to an initial on a stable color. */
export function Avatar({ name, image, seed, className, sizes = '64px' }: AvatarProps) {
  return (
    <div
      className={cx(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white [container-type:inline-size]',
        className,
      )}
      style={image ? undefined : { backgroundColor: seedColor(seed, 45) }}
    >
      {image ? (
        <Image src={image.url} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="text-[length:min(42cqw,64px)] uppercase leading-none">{name.charAt(0)}</span>
      )}
    </div>
  );
}
