import type { StoredImage } from '@/models/shared';

/** A validated image upload. */
export interface ImageFile {
  bytes: Uint8Array;
  extension: 'jpg' | 'png' | 'webp';
  contentType: string;
  width: number;
  height: number;
}

export interface ImageStorage {
  save(file: ImageFile, folder: string): Promise<StoredImage>;
  remove(key: string): Promise<void>;
}
