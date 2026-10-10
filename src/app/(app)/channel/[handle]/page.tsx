import type { Metadata } from 'next';
import { dbConnect } from '@/lib/db';
import ChannelModel, { type IChannel } from '@/models/Channel';
import ChannelView from './channel-view';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  try {
    await dbConnect();
    const channel = await ChannelModel.findOne({ handle: handle.toLowerCase() })
      .select('name description avatar')
      .lean<Pick<IChannel, 'name' | 'description' | 'avatar'>>();
    if (!channel) return { title: 'Channel' };
    return {
      title: channel.name,
      description: channel.description.slice(0, 160) || undefined,
      openGraph: { title: channel.name, images: channel.avatar ? [channel.avatar.url] : undefined },
    };
  } catch {
    return { title: 'Channel' };
  }
}

export default async function ChannelPage({ params }: Props) {
  const { handle } = await params;
  return <ChannelView handle={handle} />;
}
