import { escapeHtml, romanToNumber, tidyTitle } from './util';

// Turns a plain-text book into either one story or seasons of episodes.
// Gutenberg books have no shared markup, so headings are recognized by shape
// ("CHAPTER XII.", "PART ONE—…", "I. A SCANDAL IN BOHEMIA", "3", an all-caps title line…).
// The most specific heading style that splits the book into sensible chapters wins.

export type ParsedEpisode = { title: string; html: string };
export type ParsedSeason = { title: string; episodes: ParsedEpisode[] };
export type ParsedBook =
  | { kind: 'single'; html: string; opening: string }
  | { kind: 'series'; seasons: ParsedSeason[]; opening: string };

type Block = { lines: string[]; text: string };
type EpisodeType = 'chapter' | 'romanTitle' | 'numberTitle' | 'roman' | 'number' | 'caps';
type Heading = { index: number; type: EpisodeType | 'season'; label: string; title: string; consumed: number };

const SINGLE_MAX_CHARS = 40_000; // shorter than this reads best as one short story
const UNSPLIT_SINGLE_MAX_CHARS = 150_000; // no chapters found: still fine as one piece
const CHUNK_CHARS = 25_000; // otherwise cut long text into parts of about this size
const EPISODE_MAX_CHARS = 180_000; // the API's limit is 200k

/** The book text between Gutenberg's start and end markers, or null when the markers are missing. */
export function stripGutenberg(raw: string): string | null {
  const text = raw.replace(/\r\n?/g, '\n').replace(/﻿/g, '');
  const start = text.match(/^\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*$/im);
  if (!start || start.index === undefined) return null;
  let body = text.slice(start.index + start[0].length);
  const end = body.search(/^\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG/im);
  if (end >= 0) body = body.slice(0, end);
  const oldEnd = body.search(/^\s*End of (?:the )?Project Gutenberg/im);
  if (oldEnd >= 0) body = body.slice(0, oldEnd);
  return body;
}

const JUNK = /^\[?\s*(illustration|footnote|transcriber|sidenote)|gutenberg|^produced by|^e-?text prepared|^this e-?book was|^\[?pg\.? ?\d+\]?$|^\{\d+\}$/i;

function toBlocks(body: string): Block[] {
  return body
    .split(/\n[ \t]*\n/)
    .map((chunk) => chunk.split('\n').map((line) => line.replace(/\s+$/, '')).filter((line) => line.trim()))
    .filter((lines) => lines.length > 0)
    .map((lines) => ({ lines, text: lines.map((line) => line.trim()).join(' ') }))
    .filter((block) => !JUNK.test(block.text));
}

const NUM = String.raw`(?:[IVXLCDM]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)`;
const SEASON_RE = new RegExp(String.raw`^(part|book|volume|vol\.)\s+(the\s+)?(${NUM})\b[\s.:—–-]*(.*)$`, 'i');
const CHAPTER_RE = new RegExp(String.raw`^(chapter|chap\.|stave|letter|canto|section|adventure|story)\s+(the\s+)?(${NUM})\b[\s.:—–-]*(.*)$`, 'i');
const ROMAN_TITLE_RE = /^([IVXLCDM]{1,7})\.\s+([A-Z].{1,90})$/;
const NUMBER_TITLE_RE = /^(\d{1,3})\.\s+([A-Z].{1,90})$/;
const ROMAN_RE = /^([IVXLCDM]{1,7})\.?$/;
const NUMBER_RE = /^(\d{1,3})\.?$/;
const NOT_A_TITLE = /^(the end|finis|contents|index|illustrations|list of illustrations)\.?$/i;

function isCapsTitle(text: string) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  return (
    letters.length >= 3 &&
    text.length <= 70 &&
    letters === letters.toUpperCase() &&
    text.split(/\s+/).length <= 10 &&
    !/[,;]$/.test(text) &&
    !NOT_A_TITLE.test(text)
  );
}

/**
 * True for "Down the Rabbit-Hole" or "THE EVE OF THE WAR.", false for an opening sentence
 * such as "Marley was dead: to begin with." (which must stay in the text).
 */
function looksLikeTitle(text: string) {
  if (!text || text.length > 90 || /[,;]$/.test(text) || /^[a-z"“'‘(]/.test(text)) return false;
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters && letters === letters.toUpperCase()) return true;
  if (/[.!?:]["”’]?$/.test(text)) return false;
  const words = text.split(/\s+/).filter((word) => /^[A-Za-z]{4,}/.test(word));
  return words.length === 0 || words.filter((word) => /^[A-Z]/.test(word)).length / words.length >= 0.5;
}

/** A short line right after a bare heading that reads like its title. */
function subtitleAt(blocks: Block[], index: number) {
  const block = blocks[index];
  if (!block || block.lines.length > 2 || !looksLikeTitle(block.text)) return '';
  if (detect(blocks, index, false)) return '';
  return block.text;
}

const numberLabel = (token: string) =>
  /^[IVXLCDM]+$/i.test(token) ? String(romanToNumber(token)) : /^\d+$/.test(token) ? token : tidyTitle(token);

/** Recognizes a heading at blocks[index]. `withSubtitle` lets bare headings borrow the next block as their title. */
function detect(blocks: Block[], index: number, withSubtitle = true): Heading | null {
  const block = blocks[index];
  if (!block || block.lines.length > 3 || block.text.length > 110) return null;
  const first = block.lines[0].trim();
  const following = block.lines.slice(1).map((line) => line.trim()).join(' ');
  const rest = looksLikeTitle(following) ? following : '';
  const make = (type: Heading['type'], label: string, title: string): Heading => {
    let consumed = 0;
    if (!title && withSubtitle && type !== 'caps') {
      title = subtitleAt(blocks, index + 1);
      if (title) consumed = 1;
    }
    return { index, type, label, title: title.trim(), consumed };
  };

  let match = first.match(SEASON_RE);
  if (match) return make('season', `${tidyTitle(match[1])} ${numberLabel(match[3])}`, [match[4], rest].filter(Boolean).join(' '));
  match = first.match(CHAPTER_RE);
  if (match) return make('chapter', `${tidyTitle(match[1])} ${numberLabel(match[3])}`, [match[4], rest].filter(Boolean).join(' '));
  if (block.lines.length > 2) return null;
  match = first.match(ROMAN_TITLE_RE);
  if (match) return make('romanTitle', `Chapter ${romanToNumber(match[1])}`, [match[2], rest].filter(Boolean).join(' '));
  match = first.match(NUMBER_TITLE_RE);
  if (match) return make('numberTitle', `Chapter ${match[1]}`, [match[2], rest].filter(Boolean).join(' '));
  match = first.match(ROMAN_RE);
  if (match) return make('roman', `Chapter ${romanToNumber(match[1])}`, rest);
  match = first.match(NUMBER_RE);
  if (match) return make('number', `Chapter ${match[1]}`, rest);
  if (isCapsTitle(block.text)) return make('caps', tidyTitle(block.text), tidyTitle(block.text));
  return null;
}

function inline(text: string) {
  return escapeHtml(text.replace(/\[pg\.?\s*\d+\]|\{\d+\}/gi, '').replace(/\s+/g, ' ').trim()).replace(/_([^_]+)_/g, '<em>$1</em>');
}

function blockHtml(block: Block) {
  if (/^[\s*.·•—–\-_=~]+$/.test(block.text) && /[*·•]/.test(block.text)) return '<hr>';
  const lines = block.lines.map((line) => line.trim());
  const verse = lines.length >= 2 && lines.every((line) => line.length <= 55);
  return `<p>${verse ? lines.map(inline).join('<br>') : inline(block.text)}</p>`;
}

const size = (blocks: Block[]) => blocks.reduce((total, block) => total + block.text.length, 0);

/** Drops title lines, bylines and dedications before the story text starts. */
function skipFrontMatter(blocks: Block[]) {
  let start = 0;
  while (start < Math.min(blocks.length, 15)) {
    const text = blocks[start].text;
    if (text.length >= 120 || /[.!?]["”’]?$/.test(text)) break;
    start += 1;
  }
  return blocks.slice(start);
}

function render(blocks: Block[], headings: Map<number, Heading>) {
  const html: string[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const heading = headings.get(i);
    if (!heading) {
      html.push(blockHtml(blocks[i]));
      continue;
    }
    if (heading.type === 'season') continue;
    html.push(heading.type === 'roman' || heading.type === 'number' ? '<hr>' : `<h3>${inline(tidyTitle(heading.title || heading.label))}</h3>`);
    i += heading.consumed;
  }
  return html.join('\n');
}

/** Cuts text into parts of about CHUNK_CHARS at paragraph boundaries. */
function chunk(blocks: Block[], title: (n: number) => string): ParsedEpisode[] {
  const episodes: ParsedEpisode[] = [];
  let current: Block[] = [];
  const flush = () => {
    if (current.length) episodes.push({ title: title(episodes.length + 1), html: current.map(blockHtml).join('\n') });
    current = [];
  };
  for (const block of blocks) {
    current.push(block);
    if (size(current) >= CHUNK_CHARS) flush();
  }
  flush();
  return episodes;
}

function openingOf(blocks: Block[]) {
  return blocks.find((block) => block.text.length >= 200)?.text ?? blocks[0]?.text ?? '';
}

export function parseBook(body: string): ParsedBook | null {
  const all = toBlocks(body);
  if (all.length === 0) return null;

  const headings: Heading[] = [];
  for (let i = 0; i < all.length; i += 1) {
    const heading = detect(all, i);
    if (heading) headings.push(heading);
  }
  // A heading is real when text follows it; table-of-contents entries are followed by more headings.
  const textAfter = (heading: Heading, nextIndex: number) => size(all.slice(heading.index + 1 + heading.consumed, nextIndex));
  const real = headings.filter((heading, i) => heading.type === 'season' || textAfter(heading, headings[i + 1]?.index ?? all.length) >= 300);

  const PRIORITY: EpisodeType[] = ['chapter', 'romanTitle', 'numberTitle', 'roman', 'number', 'caps'];
  let chosen: Heading[] | null = null;
  for (const type of PRIORITY) {
    const occurrences = real.filter((heading) => heading.type === type);
    if (occurrences.length < 2 || occurrences.length > 200) continue;
    const sizes = occurrences.map((heading, i) => size(all.slice(heading.index, occurrences[i + 1]?.index ?? all.length)));
    const sorted = [...sizes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median >= 1_200 && sorted[sorted.length - 1] <= 250_000) {
      chosen = occurrences;
      break;
    }
  }

  const totalChars = size(all);

  if (!chosen) {
    const text = skipFrontMatter(all);
    if (size(text) <= UNSPLIT_SINGLE_MAX_CHARS) return { kind: 'single', html: text.map(blockHtml).join('\n'), opening: openingOf(text) };
    return { kind: 'series', seasons: [{ title: '', episodes: chunk(text, (n) => `Part ${n}`) }], opening: openingOf(text) };
  }

  const inner = new Map(real.map((heading) => [heading.index, heading]));
  const first = chosen[0].index;
  const storyBlocks = all.slice(first);

  if (totalChars <= SINGLE_MAX_CHARS) {
    const shifted = new Map([...inner].filter(([index]) => index >= first).map(([index, heading]) => [index - first, heading]));
    return { kind: 'single', html: render(storyBlocks, shifted), opening: openingOf(storyBlocks) };
  }

  // Seasons: each episode belongs to the nearest season heading before it.
  const seasonHeadings = real.filter((heading) => heading.type === 'season');
  const seasons: (ParsedSeason & { key: number })[] = [];
  chosen.forEach((heading, n) => {
    const end = chosen[n + 1]?.index ?? all.length;
    const season = [...seasonHeadings].reverse().find((candidate) => candidate.index < heading.index);
    const key = season?.index ?? -1;
    let target = seasons.find((item) => item.key === key);
    if (!target) {
      target = { key, title: season ? [season.label, season.title].filter(Boolean).join(': ') : '', episodes: [] };
      seasons.push(target);
    }
    const blocks = all.slice(heading.index + 1 + heading.consumed, end);
    const local = new Map(
      [...inner]
        .filter(([index]) => index > heading.index + heading.consumed && index < end)
        .map(([index, item]) => [index - (heading.index + 1 + heading.consumed), item]),
    );
    const title = tidyTitle(heading.title || heading.label).slice(0, 150) || `Chapter ${n + 1}`;
    const html = render(blocks, local);
    if (html.length <= EPISODE_MAX_CHARS) {
      target.episodes.push({ title, html });
    } else {
      chunk(blocks, (part) => `${title} (Part ${part})`).forEach((episode) => target.episodes.push(episode));
    }
  });

  // A single unnamed season keeps an empty title (the app shows "Season 1").
  const result = seasons.filter((season) => season.episodes.length > 0).map(({ title, episodes }) => ({ title: title.slice(0, 100), episodes }));
  if (result.length > 1 && result.some((season) => !season.title)) {
    result.forEach((season, i) => {
      if (!season.title) season.title = i === 0 ? 'Prologue' : `Part ${i + 1}`;
    });
  }
  return { kind: 'series', seasons: result, opening: openingOf(storyBlocks) };
}
