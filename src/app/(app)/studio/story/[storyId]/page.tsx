import type { Metadata } from 'next';
import StudioStoryView from './studio-story-view';

export const metadata: Metadata = { title: 'Manage story' };

type Props = { params: Promise<{ storyId: string }> };

export default async function StudioStoryPage({ params }: Props) {
  const { storyId } = await params;
  return <StudioStoryView storyId={storyId} />;
}
