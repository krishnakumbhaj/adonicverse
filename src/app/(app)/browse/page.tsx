import type { Metadata } from 'next';
import { browseTitle, type BrowseParams } from './browse-title';
import BrowseView from './browse-view';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const pick = (value: string | string[] | undefined) => (typeof value === 'string' ? value : undefined);

async function readParams(searchParams: Props['searchParams']): Promise<BrowseParams> {
  const params = await searchParams;
  return { sort: pick(params.sort), type: pick(params.type), kind: pick(params.kind), tag: pick(params.tag) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: browseTitle(await readParams(searchParams)) };
}

/** "Show all" page behind Home's shelves, tags and channel lists. */
export default async function BrowsePage({ searchParams }: Props) {
  return <BrowseView params={await readParams(searchParams)} />;
}
