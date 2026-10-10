/** "Héllo, World!" → "hello-world". Letters from any script are kept; falls back to "story". */
export function slugify(text: string) {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
  return slug || 'story';
}
