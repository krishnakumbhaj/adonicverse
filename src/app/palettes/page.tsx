import type { Metadata } from 'next';
import PaletteExplorer from './palette-explorer';

export const metadata: Metadata = {
  title: 'Color palettes',
  description: 'Compare dark-theme palettes for the story app.',
};

export default function PalettesPage() {
  return <PaletteExplorer />;
}
