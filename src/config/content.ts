export const GENRES = [
  { slug: 'romance', name: 'Romance' },
  { slug: 'fantasy', name: 'Fantasy' },
  { slug: 'sci-fi', name: 'Science Fiction' },
  { slug: 'mystery', name: 'Mystery' },
  { slug: 'thriller', name: 'Thriller' },
  { slug: 'horror', name: 'Horror' },
  { slug: 'paranormal', name: 'Paranormal' },
  { slug: 'adventure', name: 'Adventure' },
  { slug: 'action', name: 'Action' },
  { slug: 'drama', name: 'Drama' },
  { slug: 'comedy', name: 'Comedy' },
  { slug: 'slice-of-life', name: 'Slice of Life' },
  { slug: 'historical', name: 'Historical' },
  { slug: 'mythology', name: 'Mythology' },
  { slug: 'crime', name: 'Crime' },
  { slug: 'teen-fiction', name: 'Teen Fiction' },
  { slug: 'fan-fiction', name: 'Fan Fiction' },
  { slug: 'poetry', name: 'Poetry' },
  { slug: 'non-fiction', name: 'Non-Fiction' },
  { slug: 'spiritual', name: 'Spiritual' },
] as const;

export type GenreSlug = (typeof GENRES)[number]['slug'];
export const GENRE_SLUGS = GENRES.map((genre) => genre.slug) as [GenreSlug, ...GenreSlug[]];

export const STORY_TYPES = ['single', 'series'] as const;
export type StoryType = (typeof STORY_TYPES)[number];

/** Who the story is suitable for. `mature` is hidden from discovery unless asked for. */
export const CONTENT_RATINGS = ['general', 'teen', 'mature'] as const;
export type ContentRating = (typeof CONTENT_RATINGS)[number];

/** Whether a series is still being written. Single stories are always `completed`. */
export const STORY_PROGRESS = ['ongoing', 'completed', 'hiatus'] as const;
export type StoryProgress = (typeof STORY_PROGRESS)[number];

/** Languages offered in the story form (any two-letter code is accepted by the API). */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'ar', name: 'العربية (Arabic)' },
] as const;

export function languageName(code: string) {
  return LANGUAGES.find((language) => language.code === code)?.name ?? code.toUpperCase();
}

export const PUBLISH_STATUSES = ['draft', 'published'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const LIMITS = {
  channelsPerUser: 3,
  genresPerStory: 3,
  tagsPerStory: 10,
  episodeContentChars: 200_000,
  imageBytes: 4 * 1024 * 1024,
  imageMinSide: 100,
  pageSize: 20,
  maxPageSize: 50,
};

/** Names that can't be used as usernames or channel handles so they stay free for app routes. */
export const RESERVED_NAMES = new Set([
  'about', 'admin', 'api', 'app', 'auth', 'channel', 'channels', 'explore', 'feed', 'help', 'home',
  'library', 'login', 'logout', 'me', 'new', 'notifications', 'null', 'root', 'search', 'settings',
  'sign-in', 'sign-up', 'signin', 'signup', 'stories', 'story', 'studio', 'support', 'system', 'undefined',
]);
