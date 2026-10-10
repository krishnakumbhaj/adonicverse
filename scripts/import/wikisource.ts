import { parse } from 'node-html-parser';
import { htmlToText, sanitizeStoryHtml } from '@/lib/content';
import { fetchJson, sleep } from './util';

// Hindi stories from Hindi Wikisource (public-domain works such as Premchand's Mansarovar).

const API = 'https://hi.wikisource.org/w/api.php';

type ParseResponse = { parse?: { title: string; text: string }; error?: { code: string } };
type AllPagesResponse = { query?: { allpages: { title: string }[] } };

async function pageHtml(title: string) {
  const data = await fetchJson<ParseResponse>(
    `${API}?action=parse&format=json&formatversion=2&prop=text&redirects=1&page=${encodeURIComponent(title)}`,
  );
  await sleep(1000); // Wikimedia rate-limits quick bursts
  return data.parse?.text ?? null;
}

/**
 * Sub-pages of a book or collection: first in the order its contents page links them,
 * then any others Wikisource has (some contents pages don't link every chapter).
 */
export async function subpagesInOrder(page: string): Promise<string[]> {
  const prefix = `${page}/`;
  const html = await pageHtml(page);
  const titles: string[] = [];
  if (html) {
    for (const link of parse(html).querySelectorAll('a[title]')) {
      const title = link.getAttribute('title') ?? '';
      if (title.startsWith(prefix) && !link.classList.contains('new') && !titles.includes(title)) titles.push(title);
    }
  }
  const list = await fetchJson<AllPagesResponse>(
    `${API}?action=query&format=json&list=allpages&aplimit=max&apprefix=${encodeURIComponent(prefix)}`,
  ).catch(() => null);
  await sleep(1000);
  for (const { title } of list?.query?.allpages ?? []) {
    if (!titles.includes(title)) titles.push(title);
  }
  return titles;
}

/** The text of one page as clean story HTML, without page numbers, headers and navigation. */
export async function storyPage(title: string): Promise<{ html: string; text: string } | null> {
  const html = await pageHtml(title);
  if (!html) return null;
  const root = parse(html);
  root
    .querySelectorAll(
      '#headerContainer, .ws-noexport, .pagenum, .ws-pagenum, #ws-data, center, .mw-editsection, sup.reference, .references, .mw-references-wrap, style, script, table, .noprint',
    )
    .forEach((node) => node.remove());
  // Section numbers such as "( २ )" become scene breaks.
  root.querySelectorAll('.tiInherit').forEach((node) => {
    node.insertAdjacentHTML('beforebegin', '<hr>');
    node.remove();
  });
  const clean = sanitizeStoryHtml(root.toString())
    .replace(/^(\s*<hr\s*\/?>)+/, '')
    .replace(/(<hr\s*\/?>\s*)+$/, '')
    .trim();
  return { html: clean, text: htmlToText(clean) };
}

/** "मानसरोवर २/१६ दूध का दाम" → "दूध का दाम". */
export function storyTitleFromPage(page: string) {
  return page
    .split('/')
    .pop()!
    .replace(/^[\d०-९]+\s*[.)-]?\s*/, '')
    .replace(/[​-‍﻿]/g, '') // invisible joiners left over from the source
    .trim();
}
