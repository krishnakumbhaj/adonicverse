/** 1234 → "1.2K", 1234567 → "1.2M". */
export function compactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${compactNumber(count)} ${count === 1 ? one : many}`;
}

/** "Mar 4" this year, "Mar 4, 2024" otherwise. */
export function shortDate(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric', ...(!sameYear && { year: 'numeric' }) });
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
  return shortDate(iso);
}

export function storyKind(type: 'single' | 'series') {
  return type === 'series' ? 'Series' : 'Short story';
}
