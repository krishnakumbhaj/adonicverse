// Small helpers shared by the importers.

export const USER_AGENT = 'adonicImporter/1.0 (one-time import of public-domain stories)';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** fetch with a descriptive User-Agent, a timeout and a few retries for flaky responses. */
export async function politeFetch(url: string, init: RequestInit = {}, attempts = 4, timeoutMs = 45_000): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status >= 500 || response.status === 429) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await sleep(3_000 * attempt); // brief network hiccups (DNS, timeouts) usually pass
    }
  }
}

export async function fetchJson<T>(url: string, attempts?: number, timeoutMs?: number): Promise<T> {
  const response = await politeFetch(url, {}, attempts, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'with']);

/** "THE EVE OF THE WAR." → "The Eve of the War". Leaves mixed-case text alone. */
export function tidyTitle(raw: string) {
  let text = raw.replace(/\s+/g, ' ').replace(/^[\s.:—–-]+|[\s.:—–-]+$/g, '').trim();
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters && letters === letters.toUpperCase()) {
    text = text
      .toLowerCase()
      .split(' ')
      .map((word, index) => (index > 0 && SMALL_WORDS.has(word) ? word : word.replace(/^(\W*)(\w)/, (_, p, c) => p + c.toUpperCase())))
      .join(' ');
  }
  return text;
}

/** "The strange case of Dr. Jekyll" → "The Strange Case of Dr. Jekyll". Words with capitals are kept as they are. */
export function titleCase(text: string) {
  const words = tidyTitle(text).split(' ');
  return words
    .map((word, index) => {
      if (word !== word.toLowerCase()) return word;
      const edge = index === 0 || index === words.length - 1;
      return !edge && SMALL_WORDS.has(word) ? word : word.replace(/^(\W*)(\p{L})/u, (_, prefix, letter) => prefix + letter.toUpperCase());
    })
    .join(' ');
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanToNumber(roman: string) {
  const letters = roman.toUpperCase();
  let total = 0;
  for (let i = 0; i < letters.length; i += 1) {
    const value = ROMAN[letters[i]] ?? 0;
    const next = ROMAN[letters[i + 1]] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
}

/** Stable small number from a string, for picking colors and dates deterministically. */
export function hashOf(text: string) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** "Doyle, Arthur Conan" → "Arthur Conan Doyle". */
export function authorDisplayName(name: string) {
  const parts = name.split(',').map((part) => part.trim());
  return parts.length === 2 && !/\(/.test(parts[1]) ? `${parts[1]} ${parts[0]}` : name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

export const byteLength = (text: string) => Buffer.byteLength(text, 'utf8');
