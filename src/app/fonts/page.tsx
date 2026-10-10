import type { Metadata } from 'next';
import FontExplorer from './font-explorer';

export const metadata: Metadata = {
  title: 'Fonts',
  description: 'Compare interface, reading and Hindi fonts for the story app.',
};

export default function FontsPage() {
  return <FontExplorer />;
}
