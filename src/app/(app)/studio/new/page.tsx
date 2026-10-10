import type { Metadata } from 'next';
import NewStoryView from './new-story-view';

export const metadata: Metadata = { title: 'New story' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewStoryPage({ searchParams }: Props) {
  const { channel } = await searchParams;
  return <NewStoryView channelId={typeof channel === 'string' ? channel : undefined} />;
}
