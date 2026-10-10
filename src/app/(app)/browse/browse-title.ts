export type BrowseParams = { sort?: string; type?: string; kind?: string; tag?: string };

export const SORT_TITLES: Record<string, string> = {
  popular: 'Popular right now',
  updated: 'Fresh episodes',
  'top-rated': 'Top rated',
  'most-liked': 'Most liked',
  new: 'New on the shelf',
};

/** Page title for /browse. Shared by the server page (metadata) and the client view. */
export function browseTitle({ sort, kind, tag }: BrowseParams) {
  if (kind === 'channels') return 'Popular channels';
  if (tag) return `#${tag}`;
  return SORT_TITLES[sort ?? ''] ?? 'Stories';
}
