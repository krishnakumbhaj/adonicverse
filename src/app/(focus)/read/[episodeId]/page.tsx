import type { Metadata } from 'next';
import { dbConnect } from '@/lib/db';
import EpisodeModel, { type IEpisode } from '@/models/Episode';
import StoryModel, { type IStory } from '@/models/Story';
import ReaderView from './reader-view';

type Props = { params: Promise<{ episodeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { episodeId } = await params;
  if (!/^[a-f\d]{24}$/i.test(episodeId)) return { title: 'Read' };
  try {
    await dbConnect();
    const episode = await EpisodeModel.findOne({ _id: episodeId, status: 'published' }).select('title story').lean<Pick<IEpisode, 'title' | 'story'>>();
    const story = episode && (await StoryModel.findOne({ _id: episode.story, status: 'published' }).select('title type').lean<Pick<IStory, 'title' | 'type'>>());
    if (!episode || !story) return { title: 'Read' };
    return { title: story.type === 'single' ? story.title : `${episode.title} · ${story.title}` };
  } catch {
    return { title: 'Read' };
  }
}

export default async function ReadPage({ params }: Props) {
  const { episodeId } = await params;
  return <ReaderView episodeId={episodeId} />;
}
