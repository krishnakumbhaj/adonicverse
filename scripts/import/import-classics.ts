// Imports public-domain classics into adonic: English books from Project Gutenberg and
// Hindi stories from Hindi Wikisource, with generated posters, split into seasons and
// episodes where the book has them. Safe to re-run: already imported stories are skipped.
//
//   npm run import:classics -- --dry-run --limit=20   try it: nothing is saved (preview in .import-preview/)
//   npm run import:classics -- --batch=1              batch 1: every genre + 50 Hindi stories
//   npm run import:classics -- --batch=2              then batches 2, 3 and 4 (see scripts/import/plan.ts)
//
// Options: --only=english|hindi, --limit=N (stop after N new stories), --max-mb=250 (database size cap),
// --warm-catalog=3 (just cache the first 3 Gutendex pages per topic; Gutendex can be slow).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import mongoose, { type Types } from 'mongoose';
import { GENRES, type GenreSlug } from '@/config/content';
import { dbConnect } from '@/lib/db';
import type { StoredImage } from '@/models/shared';
import type { IChannel } from '@/models/Channel';
import { normalizeTag } from '@/schemas/story';
import { booksOnTopic, downloadText, prefetchTopic, type GutendexBook } from './gutenberg';
import {
  ENGLISH_TARGETS,
  FICTION_GENRES,
  FICTION_SUBJECT,
  GENRE_TOPICS,
  HINDI_AUTHORS,
  HINDI_COLLECTIONS,
  HINDI_NOVELS,
  HINDI_TARGETS,
  MAX_TEXT_BYTES,
  MIN_TEXT_BYTES,
  MISFIT_SUBJECT,
  SKIP_SUBJECT,
  SKIP_TITLE,
  SUBJECT_GENRES,
  TEEN_GENRES,
  VOLUME_TITLE,
  type ImportGenre,
} from './plan';
import { renderAvatar, renderPoster, type Artwork } from './poster';
import { parseBook, stripGutenberg, type ParsedBook } from './text-structure';
import { authorDisplayName, byteLength, sleep, titleCase } from './util';
import { storyPage, storyTitleFromPage, subpagesInOrder } from './wikisource';
import {
  clusterSizeMb,
  ensureAuthorChannel,
  editionKey,
  ensureLibraryAccount,
  importedSources,
  saveStory,
  uploadArtwork,
  type ImportedStory,
} from './writer';

loadEnvConfig(process.cwd());

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'] as const;
  }),
);
const batch = Number(args.get('batch') ?? 1);
const dryRun = args.has('dry-run');
const limit = args.has('limit') ? Number(args.get('limit')) : Infinity;
const maxMb = Number(args.get('max-mb') ?? 250);
const only = args.get('only');
const PREVIEW_DIR = path.resolve('.import-preview');

if (!ENGLISH_TARGETS[batch]) {
  console.error('Unknown --batch. Use 1, 2, 3 or 4.');
  process.exit(1);
}

let created = 0;
let stopped = '';
const log = (line: string) => console.log(line);

// ---------- saving (or previewing) one story ----------

type Target = {
  ownerId: Types.ObjectId | null;
  author: { name: string; handle?: string; description: string };
};

const channels = new Map<string, IChannel>();

async function save(story: ImportedStory, target: Target, poster: Artwork) {
  if (dryRun) {
    const base = path.join(PREVIEW_DIR, `${created + 1}-${story.source.id}`.replace(/[^\w.-]+/g, '_'));
    await writeFile(`${base}.jpg`, poster.bytes);
    const firstEpisode = story.book.kind === 'single' ? story.book.html : story.book.seasons[0].episodes[0].html;
    await writeFile(`${base}.html`, `<meta charset="utf-8"><h1>${story.title}</h1>${firstEpisode}`);
    return;
  }
  let channel = channels.get(target.author.name);
  if (!channel) {
    channel = await ensureAuthorChannel(target.ownerId!, target.author, () =>
      renderAvatar(target.author.name, target.author.handle ?? target.author.name),
    );
    channels.set(target.author.name, channel);
  }
  const image: StoredImage = await uploadArtwork(poster, 'posters');
  await saveStory(story, channel, image);
}

function describe(book: ParsedBook) {
  if (book.kind === 'single') return 'short story';
  const episodes = book.seasons.reduce((total, season) => total + season.episodes.length, 0);
  return `series · ${book.seasons.length} season${book.seasons.length > 1 ? 's' : ''} · ${episodes} episodes`;
}

async function checkBudget() {
  if (dryRun) return true;
  const size = await clusterSizeMb();
  if (size >= maxMb) {
    stopped = `database reached ${size.toFixed(0)} MB (limit ${maxMb} MB)`;
    return false;
  }
  return true;
}

const canContinue = () => !stopped && created < limit;

// ---------- Hindi (Wikisource) ----------

function excerpt(text: string, max = 260) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('।'), cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return `${(end > 80 ? cut.slice(0, end + 1) : cut).trim()}…`;
}

async function importHindi(already: number, ownerId: Types.ObjectId | null, done: Set<string>) {
  let count = already;
  const need = () => HINDI_TARGETS[batch] - count;
  if (need() <= 0) return count;
  log(`\nHindi: ${count} imported so far, adding up to ${need()}`);

  const add = async (
    key: string,
    title: string,
    book: ParsedBook,
    authorKey: keyof typeof HINDI_AUTHORS,
    genres: ImportGenre[],
    note: string,
    text: string,
  ) => {
    const author = HINDI_AUTHORS[authorKey];
    const story: ImportedStory = {
      source: { provider: 'wikisource-hi', id: key },
      title,
      synopsis: `${excerpt(text)}\n\n— ${author.name}${note}`,
      genres,
      tags: ['hindi', 'हिंदी-कहानी', normalizeTag(authorKey)],
      language: 'hi',
      contentRating: 'general',
      book,
    };
    const poster = await renderPoster({ title, author: author.name, genre: genres[0], series: book.kind === 'series', hindi: true, seed: key });
    await save(story, { ownerId, author: { name: author.name, handle: author.handle, description: author.about } }, poster);
    created += 1;
    count += 1;
    done.add(`wikisource-hi:${key}`);
    log(`  [hi ${count}] ✓ ${title} — ${describe(book)}`);
  };

  // Novels: one series each, chapters as episodes.
  for (const novel of HINDI_NOVELS) {
    if (need() <= 0 || !canContinue()) return count;
    if (done.has(`wikisource-hi:${novel.page}`)) continue;
    const chapters = sortByChapterNumber(await subpagesInOrder(novel.page).catch(() => []));
    if (chapters.length < 3) {
      log(`  skip ${novel.page} (found ${chapters.length} chapters on Wikisource)`);
      continue;
    }
    const episodes = [];
    let opening = '';
    for (const chapter of chapters) {
      const page = await storyPage(chapter).catch(() => null);
      if (!page || page.text.length < 300) continue;
      opening ||= page.text;
      episodes.push({ title: storyTitleFromPage(chapter) || `अध्याय ${episodes.length + 1}`, html: page.html });
    }
    if (episodes.length < 3) {
      log(`  skip ${novel.page} (chapters could not be read)`);
      continue;
    }
    await add(novel.page, novel.page, { kind: 'series', seasons: [{ title: '', episodes }], opening }, novel.author, novel.genres, ' का उपन्यास', opening);
  }

  // Collections: every story becomes a short story of its own.
  for (const collection of HINDI_COLLECTIONS) {
    if (need() <= 0 || !canContinue()) return count;
    const pages = await subpagesInOrder(collection.page).catch(() => []);
    if (pages.length === 0) {
      log(`  skip ${collection.page} (not found on Wikisource)`);
      continue;
    }
    let taken = 0;
    for (const pageTitle of pages) {
      if (need() <= 0 || !canContinue() || taken >= collection.max) break;
      if (done.has(`wikisource-hi:${pageTitle}`)) continue;
      const page = await storyPage(pageTitle).catch(() => null);
      const title = storyTitleFromPage(pageTitle);
      if (!page || page.text.length < 800 || !title) continue;
      await add(pageTitle, title, { kind: 'single', html: page.html, opening: page.text }, collection.author, collection.genres, `, "${collection.page}" से`, page.text);
      taken += 1;
      if (count % 10 === 0 && !(await checkBudget())) return count;
    }
  }
  return count;
}

const devanagariDigits = (text: string) => text.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));

/**
 * Chapter pages named by number go in numeric order ("निर्मला/२" before "निर्मला/१०");
 * other pages (a preface, say) stay in front in their original order.
 */
function sortByChapterNumber(pages: string[]) {
  const number = (page: string) => Number(devanagariDigits(page.split('/').pop()?.trim() ?? '') || NaN);
  const named = pages.filter((page) => !Number.isFinite(number(page)));
  const numbered = pages.filter((page) => Number.isFinite(number(page))).sort((a, b) => number(a) - number(b));
  return [...named, ...numbered];
}

// ---------- English (Gutenberg) ----------

function genresFor(book: GutendexBook, primary: ImportGenre): GenreSlug[] {
  const subjects = [...book.subjects, ...book.bookshelves].join(' | ');
  const extra = SUBJECT_GENRES.filter(([pattern]) => pattern.test(subjects)).map(([, genre]) => genre);
  return [...new Set<GenreSlug>([primary, ...extra])].slice(0, 3);
}

function tagsFor(book: GutendexBook, author: string) {
  const tags = book.subjects
    .map((subject) => subject.split(' -- ')[0].replace(/\(.*?\)/g, '').trim())
    .map((subject) => subject.replace(/^([A-Z][\w'-]+), ([A-Z][\w'. -]+)$/, '$2 $1'))
    .filter((subject) => !/^(fiction|english fiction|short stories|american fiction)$/i.test(subject));
  return [...new Set([...tags, author].map(normalizeTag).filter((tag) => tag.length >= 2 && tag.length <= 30))].slice(0, 6);
}

function englishSynopsis(book: GutendexBook, opening: string, author: string) {
  const summary = book.summaries?.[0]?.replace(/\s*\(This is an automatically generated summary\.\)\s*$/i, '').trim();
  if (summary) {
    const cut = summary.slice(0, 900);
    return cut.length < summary.length ? `${cut.slice(0, cut.lastIndexOf('. ') + 1) || cut}` : summary;
  }
  const quote = opening.length > 280 ? `${opening.slice(0, 280).replace(/\s+\S*$/, '')}…` : opening;
  return `“${quote}”\n\nA public-domain classic by ${author}.`;
}

function storyTitle(raw: string) {
  const first = raw
    .replace(/\s*=?\s*\$[a-z]\b\s*/gi, ' ') // catalog markers: "Before the Most Holy = $b (Coram Sanctissimo)"
    .split(/;|:\s|\r?\n|\s—\s|,?\s+or,\s/i)[0]
    .replace(/\s*\[[^\]]*\]\s*$/, '') // "Minute Mysteries [Detectograms]"
    .replace(/,\s*complete\.?$/i, ''); // "Eve's Diary, Complete"
  return titleCase(first.length >= 3 ? first : raw).slice(0, 150);
}

async function importEnglishBook(
  book: GutendexBook,
  primary: ImportGenre,
  ownerId: Types.ObjectId | null,
  done: Set<string>,
): Promise<string | null> {
  if (book.media_type !== 'Text') return 'not text';
  if (SKIP_TITLE.test(book.title)) return 'excluded title';
  if (VOLUME_TITLE.test(book.title)) return 'one volume of a longer book';
  const shelves = [...book.subjects, ...book.bookshelves].join(' | ');
  if (SKIP_SUBJECT.test(shelves)) return 'play, periodical or excluded subject';
  if (FICTION_GENRES.has(primary) && !FICTION_SUBJECT.test(shelves)) return 'not fiction';
  if (MISFIT_SUBJECT[primary]?.test(book.subjects.join(' | '))) return 'fits another genre better';

  const author = book.authors[0];
  const authorName = author ? authorDisplayName(author.name) : 'Various Authors';
  const title = storyTitle(book.title);
  const edition = editionKey(title, authorName);
  if (done.has(edition)) return 'another edition is already imported';

  const started = Date.now();
  const download = await downloadText(book.id, MAX_TEXT_BYTES + 30_000);
  if ('skipped' in download) return download.skipped;
  const body = stripGutenberg(download.text);
  if (!body || byteLength(body) < MIN_TEXT_BYTES) return 'no readable text';
  const parsed = parseBook(body);
  if (!parsed) return 'could not be parsed';

  const years = author?.birth_year ? ` (${author.birth_year}–${author.death_year ?? ''})` : '';
  const genres = genresFor(book, primary);
  const story: ImportedStory = {
    source: { provider: 'gutenberg', id: String(book.id) },
    title,
    synopsis: englishSynopsis(book, parsed.opening, authorName),
    genres,
    tags: tagsFor(book, authorName),
    language: 'en',
    contentRating: genres.some((genre) => TEEN_GENRES.has(genre as ImportGenre)) ? 'teen' : 'general',
    book: parsed,
  };
  const poster = await renderPoster({
    title: story.title,
    author: authorName,
    genre: primary,
    series: parsed.kind === 'series',
    hindi: false,
    seed: story.source.id,
  });
  await save(story, { ownerId, author: { name: authorName, description: `Classic stories by ${authorName}${years}. Public domain.` } }, poster);
  done.add(edition);
  log(`  [${primary}] ✓ ${story.title} — ${describe(parsed)} · ${Math.round(download.bytes / 1024)} KB · ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return null;
}

async function importEnglish(counts: Map<string, number>, ownerId: Types.ObjectId | null, done: Set<string>) {
  const targets = ENGLISH_TARGETS[batch];
  const genres = (Object.keys(targets) as ImportGenre[]).filter((genre) => (counts.get(genre) ?? 0) < targets[genre]);
  log(`\nEnglish: filling ${genres.length} genres toward batch ${batch} targets`);

  // Ask the slow catalog for every genre's first page up front, a few at a time, in the background.
  (async () => {
    const queue = genres.map((genre) => GENRE_TOPICS[genre][0]);
    const worker = async () => {
      for (let topic = queue.shift(); topic; topic = queue.shift()) await prefetchTopic(topic);
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  })();

  const sources = new Map(
    genres.map((genre) => [
      genre,
      (async function* () {
        for (const topic of GENRE_TOPICS[genre]) yield* booksOnTopic(topic);
      })(),
    ]),
  );

  // Round-robin: one story per genre per round, so every genre fills evenly.
  let active = [...genres];
  while (active.length > 0 && canContinue()) {
    for (const genre of [...active]) {
      if (!canContinue()) break;
      if ((counts.get(genre) ?? 0) >= targets[genre]) {
        active = active.filter((item) => item !== genre);
        continue;
      }
      let imported = false;
      while (!imported) {
        const next = await sources.get(genre)!.next();
        if (next.done) {
          log(`  [${genre}] no more suitable books (${counts.get(genre) ?? 0}/${targets[genre]})`);
          active = active.filter((item) => item !== genre);
          break;
        }
        const book = next.value;
        const key = `gutenberg:${book.id}`;
        if (done.has(key)) continue;
        done.add(key);
        try {
          const skipped = await importEnglishBook(book, genre, ownerId, done);
          if (skipped) {
            log(`  [${genre}] skip ${book.title.slice(0, 60)} (${skipped})`);
          } else {
            imported = true;
            created += 1;
            counts.set(genre, (counts.get(genre) ?? 0) + 1);
            if (created % 10 === 0 && !(await checkBudget())) return;
          }
        } catch (error) {
          log(`  [${genre}] failed ${book.title.slice(0, 60)}: ${(error as Error).message}`);
        }
        await sleep(300); // a short pause between books keeps the mirrors happy
      }
    }
  }
}

// ---------- run ----------

/** --warm-catalog=N: fetch the first N Gutendex pages of every topic into the local cache, then stop. */
async function warmCatalog(pageCount: number) {
  const topics = [...new Set(Object.values(GENRE_TOPICS).flat())];
  log(`Caching ${pageCount} catalog page(s) for ${topics.length} topics…`);
  const worker = async () => {
    for (let topic = topics.shift(); topic; topic = topics.shift()) {
      const loaded = await prefetchTopic(topic, pageCount);
      log(`  ${topic}: ${loaded} page(s)`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

async function main() {
  if (args.has('warm-catalog')) return warmCatalog(Number(args.get('warm-catalog')) || 3);
  log(`${dryRun ? 'DRY RUN (nothing is saved)' : 'IMPORT'} · batch ${batch}${Number.isFinite(limit) ? ` · limit ${limit}` : ''}`);
  let ownerId: Types.ObjectId | null = null;
  const done = new Set<string>();
  const counts = new Map<string, number>();
  let hindiCount = 0;

  if (dryRun) {
    await mkdir(PREVIEW_DIR, { recursive: true });
  } else {
    await dbConnect();
    if (!(await checkBudget())) throw new Error(stopped);
    ownerId = (await ensureLibraryAccount())._id;
    const existing = await importedSources();
    existing.keys.forEach((key) => done.add(key));
    for (const story of existing.stories) {
      if (story.language === 'hi') hindiCount += 1;
      else counts.set(story.genres[0], (counts.get(story.genres[0]) ?? 0) + 1);
    }
    log(`Already imported: ${existing.stories.length} stories (${hindiCount} Hindi)`);
  }

  if (only !== 'english') hindiCount = await importHindi(hindiCount, ownerId, done);
  if (only !== 'hindi' && canContinue()) await importEnglish(counts, ownerId, done);

  log(`\nDone: ${created} new stories${stopped ? ` — stopped early: ${stopped}` : ''}.`);
  const names = new Map(GENRES.map((genre) => [genre.slug, genre.name]));
  log([...counts].map(([genre, count]) => `${names.get(genre as GenreSlug) ?? genre}: ${count}`).join(' · '));
  log(`Hindi: ${hindiCount}`);
  if (dryRun) log(`Preview files (posters and first episodes): ${PREVIEW_DIR}`);
  else log(`Database size now: ${(await clusterSizeMb()).toFixed(1)} MB of 512 MB`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
