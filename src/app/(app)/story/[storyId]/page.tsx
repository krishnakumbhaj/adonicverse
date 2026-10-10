import type { Metadata } from 'next';
import { dbConnect } from '@/lib/db';
import { markdownToPlainText } from '@/lib/markdown';
import StoryModel, { type IStory } from '@/models/Story';
import StoryView from './story-view';

type Props = { params: Promise<{ storyId: string }> };

/** Title, description and poster for link previews (published stories only). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storyId } = await params;
  if (!/^[a-f\d]{24}$/i.test(storyId)) return { title: 'Story' };
  try {
    await dbConnect();
    const story = await StoryModel.findOne({ _id: storyId, status: 'published' })
      .select('title synopsis poster')
      .lean<Pick<IStory, 'title' | 'synopsis' | 'poster'>>();
    if (!story) return { title: 'Story' };
    const description = markdownToPlainText(story.synopsis).slice(0, 160) || undefined;
    return {
      title: story.title,
      description,
      openGraph: { title: story.title, description, images: story.poster ? [story.poster.url] : undefined },
    };
  } catch {
    return { title: 'Story' };
  }
}

export default async function StoryPage({ params }: Props) {
  const { storyId } = await params;
  return <StoryView storyId={storyId} />;
}
