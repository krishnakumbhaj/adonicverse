import type { GenreSlug } from './content';

/** One strong color per genre (Spotify "Browse all" style). Used by the genre tiles and generated posters. */
export const GENRE_COLORS: Record<GenreSlug, string> = {
  romance: '#e8115b',
  fantasy: '#8d67ab',
  'sci-fi': '#1e3264',
  mystery: '#477d95',
  thriller: '#ba5d07',
  horror: '#7d4b32',
  paranormal: '#503750',
  adventure: '#148a08',
  action: '#e13300',
  drama: '#8400e7',
  comedy: '#d84000',
  'slice-of-life': '#27856a',
  historical: '#a56752',
  mythology: '#af2896',
  crime: '#283ea8',
  'teen-fiction': '#e91429',
  'fan-fiction': '#0d73ec',
  poetry: '#8c1932',
  'non-fiction': '#608108',
  spiritual: '#006450',
};
