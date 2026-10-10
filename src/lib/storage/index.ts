import { cloudinaryStorage } from './cloudinary';
import { localDiskStorage } from './local';
import type { ImageStorage } from './types';

export type { ImageFile, ImageStorage } from './types';

/** Cloudinary when it is configured (or `STORAGE_DRIVER=cloudinary`), otherwise the local disk. */
export function imageStorage(): ImageStorage {
  const driver =
    process.env.STORAGE_DRIVER ||
    (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local');
  return driver === 'cloudinary' ? cloudinaryStorage : localDiskStorage;
}

export const isLocalStorage = () => imageStorage() === localDiskStorage;
