import path from 'node:path';
import sharp from 'sharp';
import { GENRES, type GenreSlug } from '@/config/content';
import { GENRE_COLORS } from '@/config/genre-colors';
import { escapeHtml, hashOf } from './util';

// Generated artwork for imported stories and author channels. Text is drawn with fonts
// installed on this computer (Segoe UI for English, Nirmala UI for Hindi on Windows).

const WIDTH = 1000;
const HEIGHT = 1500;
const LOGO = path.resolve('src/assets/brand/logo.png');
const LATIN_FONT = "'Segoe UI', Arial, sans-serif";
const TITLE_FONT = "'Segoe UI Black', 'Segoe UI', Arial, sans-serif";
const HINDI_FONT = "'Nirmala UI', 'Segoe UI', sans-serif";

export type Artwork = { bytes: Uint8Array; width: number; height: number };

/** Blends a hex color toward another (0 = unchanged, 1 = target). */
function mix(hex: string, target: string, amount: number) {
  const channels = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  const [a, b] = [channels(hex), channels(target)];
  return `#${a.map((value, i) => Math.round(value + (b[i] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

/** Greedy word wrap by an estimated characters-per-line budget. */
function wrap(text: string, maxChars: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitTitle(title: string, hindi: boolean) {
  const widthFactor = hindi ? 0.6 : 0.58;
  for (const size of [124, 108, 96, 84, 74, 66, 58]) {
    const lines = wrap(title, Math.floor(860 / (size * widthFactor)));
    if (lines.length <= (size >= 84 ? 4 : 5)) return { size, lines };
  }
  const lines = wrap(title, Math.floor(860 / (58 * widthFactor)));
  return { size: 58, lines: [...lines.slice(0, 4), `${lines[4]}…`] };
}

export async function renderPoster(input: {
  title: string;
  author: string;
  genre: GenreSlug;
  series: boolean;
  hindi: boolean;
  seed: string;
}): Promise<Artwork> {
  const base = GENRE_COLORS[input.genre];
  const light = mix(base, '#ffffff', 0.4);
  const hash = hashOf(input.seed);
  const cx = 160 + (hash % 680);
  const cy = 180 + ((hash >>> 10) % 560);
  const { size, lines } = fitTitle(input.title, input.hindi);
  const lineHeight = Math.round(size * (input.hindi ? 1.25 : 1.06));
  const lastBaseline = 1250;
  const firstBaseline = lastBaseline - (lines.length - 1) * lineHeight;
  const genreName = (GENRES.find((genre) => genre.slug === input.genre)?.name ?? input.genre).toUpperCase();
  const kind = input.hindi ? (input.series ? 'धारावाहिक' : 'कहानी') : input.series ? 'SERIES' : 'SHORT STORY';
  const kindWidth = kind.length * (input.hindi ? 26 : 19) + 48;
  const titleFont = input.hindi ? HINDI_FONT : TITLE_FONT;

  const rings = [170, 290, 420, 570]
    .map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.16 - i * 0.03}" stroke-width="2"/>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="${base}"/>
      <stop offset="0.55" stop-color="${mix(base, '#000000', 0.75)}"/>
      <stop offset="1" stop-color="#060606"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${light}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${light}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.4" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="560" fill="url(#glow)"/>
  ${rings}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fade)"/>
  <text x="70" y="112" font-family="${LATIN_FONT}" font-size="26" font-weight="700" letter-spacing="8" fill="#fff" fill-opacity="0.85">ADONIC CLASSICS</text>
  <rect x="${930 - kindWidth}" y="74" width="${kindWidth}" height="52" rx="26" fill="#000" fill-opacity="0.35" stroke="#fff" stroke-opacity="0.35"/>
  <text x="${930 - kindWidth / 2}" y="109" text-anchor="middle" font-family="${input.hindi ? HINDI_FONT : LATIN_FONT}" font-size="24" font-weight="700" letter-spacing="${input.hindi ? 0 : 4}" fill="#fff">${escapeHtml(kind)}</text>
  <rect x="70" y="${firstBaseline - size - 70}" width="90" height="6" rx="3" fill="${light}"/>
  <text x="70" y="${firstBaseline - size - 22}" font-family="${LATIN_FONT}" font-size="28" font-weight="700" letter-spacing="6" fill="${light}">${escapeHtml(genreName)}</text>
  ${lines
    .map(
      (line, i) =>
        `<text x="70" y="${firstBaseline + i * lineHeight}" font-family="${titleFont}" font-size="${size}" font-weight="${input.hindi ? 700 : 900}" fill="#fff">${escapeHtml(line)}</text>`,
    )
    .join('')}
  <text x="70" y="1385" font-family="${input.hindi ? HINDI_FONT : LATIN_FONT}" font-size="40" font-weight="600" fill="#fff" fill-opacity="0.82">${escapeHtml(input.author)}</text>
</svg>`;

  const logo = await sharp(LOGO).resize({ height: 52 }).png().toBuffer({ resolveWithObject: true });
  const bytes = await sharp(Buffer.from(svg))
    .composite([{ input: logo.data, top: 1340, left: WIDTH - 70 - logo.info.width }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return { bytes: new Uint8Array(bytes), width: WIDTH, height: HEIGHT };
}

/** Round-friendly square avatar with the author's initials. */
export async function renderAvatar(name: string, seed: string): Promise<Artwork> {
  const palette = Object.values(GENRE_COLORS);
  const base = palette[hashOf(seed) % palette.length];
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name.trim())].map((part) => part.segment);
  const hindi = /[ऀ-ॿ]/.test(name);
  const words = name.trim().split(/\s+/);
  const initials = hindi ? segments[0] : (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(base, '#ffffff', 0.15)}"/><stop offset="1" stop-color="${mix(base, '#000000', 0.55)}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="256" y="${hindi ? 320 : 300}" text-anchor="middle" font-family="${hindi ? HINDI_FONT : TITLE_FONT}" font-size="${hindi ? 210 : 190}" font-weight="900" fill="#fff">${escapeHtml(initials)}</text>
</svg>`;
  const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { bytes: new Uint8Array(bytes), width: 512, height: 512 };
}
