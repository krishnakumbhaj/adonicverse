import { isLocalStorage } from '@/lib/storage';
import { readLocalImage } from '@/lib/storage/local';

const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Serves images saved by the local storage driver. With Cloudinary, images are served from its CDN. */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const key = (await context.params).key.join('/');
  const file = isLocalStorage() ? await readLocalImage(key) : null;
  if (!file) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': CONTENT_TYPES[key.split('.').pop() ?? ''] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
