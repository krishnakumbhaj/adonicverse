import {
  Backpack,
  Coffee,
  Compass,
  Drama,
  Feather,
  Fingerprint,
  Flame,
  Flower2,
  Ghost,
  Heart,
  KeyRound,
  Landmark,
  Laugh,
  Moon,
  Newspaper,
  Rocket,
  Sparkles,
  Star,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { GENRES, type GenreSlug } from '@/config/content';
import { GENRE_COLORS } from '@/config/genre-colors';

const GENRE_ICONS: Record<GenreSlug, LucideIcon> = {
  romance: Heart,
  fantasy: Sparkles,
  'sci-fi': Rocket,
  mystery: KeyRound,
  thriller: Zap,
  horror: Ghost,
  paranormal: Moon,
  adventure: Compass,
  action: Swords,
  drama: Drama,
  comedy: Laugh,
  'slice-of-life': Coffee,
  historical: Landmark,
  mythology: Flame,
  crime: Fingerprint,
  'teen-fiction': Backpack,
  'fan-fiction': Star,
  poetry: Feather,
  'non-fiction': Newspaper,
  spiritual: Flower2,
};

/** Tile color and icon for each genre, in the spirit of Spotify's "Browse all" tiles. */
export const GENRE_ART = Object.fromEntries(
  GENRES.map(({ slug }) => [slug, { color: GENRE_COLORS[slug], Icon: GENRE_ICONS[slug] }]),
) as Record<GenreSlug, { color: string; Icon: LucideIcon }>;

export function genreName(slug: string) {
  return GENRES.find((genre) => genre.slug === slug)?.name ?? slug;
}
