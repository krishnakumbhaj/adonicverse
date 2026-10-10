import sanitizeHtml from 'sanitize-html';

const STORY_HTML: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a',
  ],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
  },
};

/** Keeps the formatting a story editor produces and drops everything else (scripts, styles, images). */
export function sanitizeStoryHtml(html: string) {
  return sanitizeHtml(html, STORY_HTML).trim();
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

/** Plain text of already-sanitized HTML. Block tags separate words; inline tags don't. */
export function htmlToText(html: string) {
  return html
    .replace(/<\/?(p|h[1-6]|li|ul|ol|blockquote|hr|br)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}

const WORDS_PER_MINUTE = 200;

export function measureText(html: string) {
  const text = htmlToText(html);
  const wordCount = text ? text.split(' ').length : 0;
  return { wordCount, readingMinutes: Math.ceil(wordCount / WORDS_PER_MINUTE) };
}
