import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GENRES, type GenreSlug } from '@/config/content';
import GenreView from './genre-view';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: GENRES.find((genre) => genre.slug === slug)?.name ?? 'Genre' };
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params;
  if (!GENRES.some((genre) => genre.slug === slug)) notFound();
  return <GenreView slug={slug as GenreSlug} />;
}
