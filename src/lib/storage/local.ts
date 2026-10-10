import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImageStorage } from './types';

/**
 * Development storage: files go to `LOCAL_UPLOADS_DIR` (default `.uploads/`) and are served by
 * `/api/media/...`. Don't use it on serverless hosts, where the disk is not kept between requests.
 */
const MEDIA_ROUTE = '/api/media';
const SAFE_KEY = /^[a-z0-9-]+\/[a-f0-9-]{36}\.(jpg|png|webp)$/;

const uploadsDir = () => path.resolve(process.env.LOCAL_UPLOADS_DIR || '.uploads');

export const localDiskStorage: ImageStorage = {
  async save(file, folder) {
    const key = `${folder}/${randomUUID()}.${file.extension}`;
    const target = path.join(uploadsDir(), key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.bytes);
    return { url: `${MEDIA_ROUTE}/${key}`, key, width: file.width, height: file.height };
  },

  async remove(key) {
    if (!SAFE_KEY.test(key)) return;
    await unlink(path.join(uploadsDir(), key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  },
};

/** Reads a stored file for `/api/media`. Returns null for unknown or unsafe keys. */
export async function readLocalImage(key: string) {
  if (!SAFE_KEY.test(key)) return null;
  try {
    return await readFile(path.join(uploadsDir(), key));
  } catch {
    return null;
  }
}
