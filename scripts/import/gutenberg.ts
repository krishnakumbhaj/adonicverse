import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchJson, politeFetch } from './util';

// English books: the catalog comes from Gutendex (a JSON API over Project Gutenberg's catalog),
// and the text from Gutenberg mirrors, because Gutenberg asks that automated downloads not
// use its main site.

export type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean | null;
  media_type: string;
  summaries?: string[];
  download_count: number;
};

type GutendexPage = { next: string | null; results: GutendexBook[] };

// Fastest official mirrors first (measured ~3.5 s per 600 KB book); pglaf is slow, so it's the fallback.
const MIRRORS = [
  'https://mirror.csclub.uwaterloo.ca/gutenberg',
  'https://mirrors.xmission.com/gutenberg',
  'https://www.mirrorservice.org/sites/ftp.ibiblio.org/pub/docs/books/gutenberg',
  'https://gutenberg.pglaf.org',
];

// Gutendex is free and often slow, so every catalog page is kept on disk once fetched
// (re-runs and later batches don't ask again) and the next page loads while books are processed.
const CACHE_DIR = path.resolve('.import-cache/gutendex');
const pages = new Map<string, Promise<GutendexPage>>();

function catalogPage(url: string) {
  let page = pages.get(url);
  if (!page) {
    page = (async () => {
      const file = path.join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.json`);
      const cached = await readFile(file, 'utf8').catch(() => null);
      if (cached) return JSON.parse(cached) as GutendexPage;
      const fresh = await fetchJson<GutendexPage>(url, 5, 120_000);
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(file, JSON.stringify(fresh));
      return fresh;
    })();
    page.catch(() => pages.delete(url)); // allow a retry later
    pages.set(url, page);
  }
  return page;
}

export function topicUrl(topic: string) {
  return `https://gutendex.com/books/?topic=${encodeURIComponent(topic)}&languages=en&copyright=false&mime_type=text%2Fplain`;
}

/** Loads a topic's first catalog pages (resolves when they're cached; never throws). Returns how many loaded. */
export async function prefetchTopic(topic: string, pageCount = 1) {
  let url: string | null = topicUrl(topic);
  let loaded = 0;
  while (url && loaded < pageCount) {
    const page: GutendexPage | null = await catalogPage(url).catch(() => null);
    if (!page) break;
    loaded += 1;
    url = page.next;
  }
  return loaded;
}

/** Public-domain English books on a topic, most downloaded first. Stops quietly if Gutendex is unreachable. */
export async function* booksOnTopic(topic: string): AsyncGenerator<GutendexBook> {
  let url: string | null = topicUrl(topic);
  while (url) {
    let page: GutendexPage;
    try {
      page = await catalogPage(url);
    } catch (error) {
      console.log(`  (could not list "${topic}" books: ${(error as Error).message}; moving on)`);
      return;
    }
    if (page.next) catalogPage(page.next).catch(() => {});
    for (const book of page.results) yield book;
    url = page.next;
  }
}

/** Mirror folder of a book: 1661 → 1/6/6/1661, 120 → 1/2/120, 7 → 0/7. */
function folder(id: number) {
  const digits = String(id);
  return digits.length === 1 ? `0/${digits}` : `${digits.slice(0, -1).split('').join('/')}/${digits}`;
}

function candidates(id: number) {
  return [
    ...MIRRORS.flatMap((mirror) => [`${mirror}/${folder(id)}/${id}-0.txt`, `${mirror}/${folder(id)}/${id}.txt`]),
    // Newer books only exist as generated files.
    ...MIRRORS.map((mirror) => `${mirror}/cache/epub/${id}/pg${id}.txt`),
  ];
}

function decode(bytes: ArrayBuffer) {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const broken = (utf8.match(/�/g) ?? []).length;
  return broken > 10 ? new TextDecoder('latin1').decode(bytes) : utf8;
}

export type Download = { text: string; bytes: number } | { skipped: string };

/** Downloads the plain text from a mirror, checking its size first so large books aren't fetched. */
export async function downloadText(id: number, maxBytes: number): Promise<Download> {
  for (const url of candidates(id)) {
    const head = await politeFetch(url, { method: 'HEAD' }).catch(() => null);
    if (!head?.ok) continue;
    const length = Number(head.headers.get('content-length') ?? 0);
    if (length > maxBytes) return { skipped: `too long (${Math.round(length / 1024)} KB)` };
    const response = await politeFetch(url);
    if (!response.ok) continue;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) return { skipped: `too long (${Math.round(buffer.byteLength / 1024)} KB)` };
    return { text: decode(buffer), bytes: buffer.byteLength };
  }
  return { skipped: 'not found on the mirrors' };
}
