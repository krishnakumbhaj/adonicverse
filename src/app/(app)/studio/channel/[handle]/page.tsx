import type { Metadata } from 'next';
import StudioChannelView from './studio-channel-view';

export const metadata: Metadata = { title: 'Manage channel' };

type Props = { params: Promise<{ handle: string }> };

export default async function StudioChannelPage({ params }: Props) {
  const { handle } = await params;
  return <StudioChannelView handle={handle} />;
}
