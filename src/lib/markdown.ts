import { Marked, marked, type Token } from 'marked';

// Writers can format synopses, descriptions, bios, reviews and comments with Markdown
// (**bold**, *italic*, lists, links…), and paste Markdown into the story editor.

/** GitHub-style Markdown; a single line break stays a line break, as people expect when typing. */
export const MARKDOWN_OPTIONS = { gfm: true, breaks: true } as const;

/** True when pasted text is clearly written in Markdown rather than plain prose. */
export function looksLikeMarkdown(text: string) {
  return [
    /^ {0,3}#{1,6}\s+\S/m, // # Heading
    /\*\*[^*\n]+\*\*|__[^_\n]+__/, // **bold**
    /(^|[\s(])[*_][^\s*_][^*_\n]*[*_](?=$|[\s).,!?:;])/m, // *italic*
    /~~[^~\n]+~~/, // ~~strike~~
    /^ {0,3}>\s/m, // > quote
    /^ {0,3}([-*+]|\d+[.)])\s+\S/m, // - list / 1. list
    /^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/m, // ---
    /\[[^\]\n]+\]\((https?:\/\/|mailto:)[^)\s]+\)/, // [link](https://…)
  ].some((pattern) => pattern.test(text));
}

// Raw HTML inside Markdown is kept as visible text, never as markup.
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const storyMarked = new Marked({ ...MARKDOWN_OPTIONS, async: false, renderer: { html: ({ text }) => escapeHtml(text) } });

/**
 * Markdown pasted into the story editor, as the HTML the editor understands. One line stays
 * inline (so it joins the paragraph it's pasted into); headings map onto the editor's two sizes.
 */
export function markdownToStoryHtml(text: string) {
  const html = text.includes('\n') ? (storyMarked.parse(text) as string) : (storyMarked.parseInline(text) as string);
  return html.replace(/<(\/?)h1\b/g, '<$1h2').replace(/<(\/?)h[4-6]\b/g, '<$1h3');
}

/** The words of a Markdown text without its symbols, for previews and page descriptions. */
export function markdownToPlainText(text: string) {
  const words = (tokens: Token[]): string =>
    tokens
      .map((token) => {
        if (token.type === 'list') return token.items.map((item: { tokens: Token[] }) => words(item.tokens)).join(' ');
        if ('tokens' in token && token.tokens?.length) return words(token.tokens);
        if (token.type === 'space' || token.type === 'hr' || token.type === 'br') return ' ';
        return 'text' in token ? String(token.text) : '';
      })
      .join(' ');
  return words(marked.lexer(text, MARKDOWN_OPTIONS)).replace(/\s+/g, ' ').replace(/\s([.,!?;:])/g, '$1').trim();
}
