import type { GenreSlug } from '@/config/content';

// What to import, in what order. Batch 1 covers every genre so the site looks complete;
// later batches fill thriller, romance and horror first, then everything else.

export type ImportGenre = Exclude<GenreSlug, 'fan-fiction'>; // no public-domain source exists

/** Gutendex topic searches (matched against Gutenberg subjects and bookshelves), best first. */
export const GENRE_TOPICS: Record<ImportGenre, string[]> = {
  thriller: ['spy stories', 'suspense', 'thrillers'],
  romance: ['love stories', 'romance'],
  horror: ['horror', 'ghost stories'],
  mystery: ['detective and mystery', 'mystery fiction'],
  'sci-fi': ['science fiction'],
  fantasy: ['fantasy', 'fairy tales'],
  adventure: ['adventure stories', 'sea stories'],
  paranormal: ['supernatural', 'vampires'],
  crime: ['crime', 'murder'],
  action: ['western stories', 'war stories', 'pirates'],
  drama: ['domestic fiction', 'psychological fiction'],
  comedy: ['humorous stories', 'humor'],
  historical: ['historical fiction'],
  mythology: ['mythology', 'legends', 'folklore'],
  'slice-of-life': ['country life', 'city and town life', 'family life'],
  'teen-fiction': ['school stories', 'boarding schools'],
  poetry: ['poetry'],
  'non-fiction': ['essays', 'voyages and travels'],
  spiritual: ['meditations', 'buddhism', 'taoism', 'spiritual life'],
};

/** Final number of English stories per genre (≈ 900 in total). */
const FINAL: Record<ImportGenre, number> = {
  thriller: 140,
  romance: 140,
  horror: 140,
  mystery: 70,
  'sci-fi': 70,
  fantasy: 55,
  adventure: 45,
  paranormal: 30,
  crime: 30,
  action: 30,
  drama: 30,
  comedy: 25,
  historical: 25,
  mythology: 20,
  'slice-of-life': 15,
  'teen-fiction': 10,
  poetry: 10,
  'non-fiction': 10,
  spiritual: 10,
};

const GENRES = Object.keys(FINAL) as ImportGenre[];
const capAt = (cap: number) => Object.fromEntries(GENRES.map((genre) => [genre, Math.min(cap, FINAL[genre])]));

/** Cumulative English targets per genre after each batch. */
export const ENGLISH_TARGETS: Record<number, Record<ImportGenre, number>> = {
  1: capAt(12) as Record<ImportGenre, number>,
  2: { ...(capAt(12) as Record<ImportGenre, number>), thriller: 80, romance: 80, horror: 80 },
  3: { ...(capAt(12) as Record<ImportGenre, number>), thriller: 140, romance: 140, horror: 140, mystery: 45, 'sci-fi': 45 },
  4: FINAL,
};

/** Cumulative number of Hindi stories after each batch. */
export const HINDI_TARGETS: Record<number, number> = { 1: 50, 2: 100, 3: 100, 4: 100 };

/** Words in a Gutenberg subject that point to more genres for the same book (up to 3 in total). */
export const SUBJECT_GENRES: [RegExp, ImportGenre][] = [
  [/spy stories|suspense|thriller/i, 'thriller'],
  [/love stories|romance/i, 'romance'],
  [/horror|ghost stories/i, 'horror'],
  [/detective|mystery/i, 'mystery'],
  [/science fiction/i, 'sci-fi'],
  [/fantasy|fairy tales/i, 'fantasy'],
  [/adventure|sea stories/i, 'adventure'],
  [/supernatural|vampire/i, 'paranormal'],
  [/crime|murder|criminals/i, 'crime'],
  [/western stories|war stories|pirates/i, 'action'],
  [/domestic fiction|psychological fiction/i, 'drama'],
  [/humor|humorous/i, 'comedy'],
  [/historical fiction/i, 'historical'],
  [/mythology|legends|folklore/i, 'mythology'],
  [/school stories/i, 'teen-fiction'],
];

/** Genres shown to readers as "Teen" rather than "Everyone". */
export const TEEN_GENRES = new Set<ImportGenre>(['horror', 'thriller', 'crime', 'paranormal']);

/** Books we don't import: plays, periodicals, reference works, erotica, and titles known for slurs. */
export const SKIP_SUBJECT = /\bdrama\b|tragedies|comedies|periodicals|dictionaries|cookery|bibliograph|erotic|pornograph|sex customs/i;
export const SKIP_TITLE =
  /fu[- ]?manchu|\bsambo\b|clansman|red hook|\bn[i1]gg|yellow peril|white slave|\bsex\b|\bsexual|linked index|\bindex (to|of)\b|project gutenberg (edition|works)/i;
/** Genres that must be stories: books whose subjects never say fiction/tales/etc. are essays and studies. */
export const FICTION_GENRES = new Set<ImportGenre>([
  'thriller', 'romance', 'horror', 'mystery', 'sci-fi', 'fantasy', 'adventure', 'paranormal', 'crime', 'action', 'drama', 'comedy',
]);
export const FICTION_SUBJECT = /fiction|stories|tales|romances|legends|fables|fairy|novel|juvenile/i;
/**
 * Gutenberg's broad categories ("Crime, Thrillers and Mystery") pull in books that belong to
 * another genre: ghost stories under crime, science fiction under romance. Skip them there.
 */
export const MISFIT_SUBJECT: Partial<Record<ImportGenre, RegExp>> = {
  crime: /ghost stories|supernatural|horror tales|vampires/i,
  romance: /science fiction|ghost stories|horror tales/i,
  poetry: /criticism|aesthetics|poetics|versification|bibliograph/i, // books about poetry, not poems
};

/**
 * One part of a longer book ("Oliver Twist, Vol. 2 (of 3)", "Huckleberry Finn, Chapters 01 to 05"):
 * readers would start or stop mid-story.
 */
export const VOLUME_TITLE = /\bvol(\.|ume)\s*([\divxl]+)\b|\(of\s+\d+\)|\bchapters?\s+[\divxl]+\s*(to|-|–)\s*[\divxl]+|\bpart\s+([2-9]|[ivx]{2,})\b/i;

export type HindiAuthor = { name: string; handle: string; about: string };

export const HINDI_AUTHORS = {
  premchand: { name: 'प्रेमचंद', handle: 'premchand', about: 'प्रेमचंद (1880–1936) — हिंदी-उर्दू के महान कथाकार। उनकी कहानियाँ और उपन्यास, अब सार्वजनिक डोमेन में।' },
  prasad: { name: 'जयशंकर प्रसाद', handle: 'jaishankar_prasad', about: 'जयशंकर प्रसाद (1889–1937) — छायावाद के कवि और कथाकार।' },
} satisfies Record<string, HindiAuthor>;

type HindiSource = { page: string; author: keyof typeof HINDI_AUTHORS; genres: ImportGenre[] };

/**
 * Novels split into chapters on Hindi Wikisource; each becomes a series.
 * (Only works published before 1931, which are public domain in India and the US.)
 */
export const HINDI_NOVELS: HindiSource[] = [
  { page: 'निर्मला', author: 'premchand', genres: ['drama', 'romance'] },
  { page: 'सेवासदन', author: 'premchand', genres: ['drama', 'slice-of-life'] },
];

/** Story collections; each story in them becomes its own short story. Imported in this order. */
export const HINDI_COLLECTIONS: (HindiSource & { max: number })[] = [
  { page: 'जयशंकर प्रसाद की श्रेष्ठ कहानियां', author: 'prasad', genres: ['romance', 'historical'], max: 12 },
  ...['१', '२', '३', '४', '५', '६', '७', '८'].map((digit) => ({
    page: `मानसरोवर ${digit}`,
    author: 'premchand' as const,
    genres: ['drama', 'slice-of-life'] as ImportGenre[],
    max: 100,
  })),
];

/**
 * Size limits for one book's text: big enough to be a story, small enough for the free database.
 * At 300 KB the average imported book is ~180 KB, so ~900 English stories fit in ~165 MB.
 */
export const MIN_TEXT_BYTES = 3_000;
export const MAX_TEXT_BYTES = 300_000;
