import type { Metadata } from 'next';
import UserView from './user-view';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function UserPage({ params }: Props) {
  const { username } = await params;
  return <UserView username={username} />;
}
