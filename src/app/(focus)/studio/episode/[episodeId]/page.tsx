import type { Metadata } from 'next';
import EpisodeEditor from './episode-editor';

export const metadata: Metadata = { title: 'Write' };

type Props = { params: Promise<{ episodeId: string }> };

export default async function EpisodeEditorPage({ params }: Props) {
  const { episodeId } = await params;
  return <EpisodeEditor episodeId={episodeId} />;
}
