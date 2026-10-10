import { imageSize } from 'image-size';
import { LIMITS } from '@/config/content';
import type { StoredImage } from '@/models/shared';
import { ApiError, badRequest } from './api';
import { imageStorage, type ImageFile } from './storage';

export type ImageFolder = 'avatars' | 'channel-avatars' | 'channel-banners' | 'posters';

const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;

const tooLarge = () =>
  new ApiError(413, 'FILE_TOO_LARGE', `Images must be ${LIMITS.imageBytes / (1024 * 1024)} MB or smaller.`);

/**
 * Reads the `file` field of a multipart request and checks it is a real JPEG, PNG, or WebP
 * image by reading its bytes; the browser-supplied type and file name are not trusted.
 */
export async function readImageUpload(request: Request): Promise<ImageFile> {
  if (Number(request.headers.get('content-length') ?? 0) > LIMITS.imageBytes + 64 * 1024) throw tooLarge();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest('Send the image as multipart/form-data in a field named "file".');
  }

  const file = form.get('file');
  if (!file || typeof file === 'string' || file.size === 0) {
    throw badRequest('Attach an image in a field named "file".');
  }
  if (file.size > LIMITS.imageBytes) throw tooLarge();

  const bytes = new Uint8Array(await file.arrayBuffer());
  let info: ReturnType<typeof imageSize> | undefined;
  try {
    info = imageSize(bytes);
  } catch {
    info = undefined;
  }
  const extension = info?.type;
  if (!info || !extension || !(extension in CONTENT_TYPES)) {
    throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'Upload a JPEG, PNG, or WebP image.');
  }
  if (info.width < LIMITS.imageMinSide || info.height < LIMITS.imageMinSide) {
    throw badRequest(`Images must be at least ${LIMITS.imageMinSide}×${LIMITS.imageMinSide} pixels.`);
  }

  const type = extension as keyof typeof CONTENT_TYPES;
  return { bytes, extension: type, contentType: CONTENT_TYPES[type], width: info.width, height: info.height };
}

/**
 * Stores `file`, saves it on the owning document with `persist`, then deletes the image it replaced.
 * If `persist` fails, the new file is deleted again.
 */
export async function replaceImage(options: {
  file: ImageFile;
  folder: ImageFolder;
  previous: StoredImage | null;
  persist: (image: StoredImage) => Promise<unknown>;
}) {
  const image = await imageStorage().save(options.file, options.folder);
  try {
    await options.persist(image);
  } catch (error) {
    await discardImages([image]);
    throw error;
  }
  await discardImages([options.previous]);
  return image;
}

/** Deletes images from storage. Failures are logged, not thrown: the database is already updated. */
export async function discardImages(images: (StoredImage | null | undefined)[]) {
  const storage = imageStorage();
  await Promise.all(
    images.flatMap((image) =>
      image
        ? [storage.remove(image.key).catch((error) => console.error(`Failed to delete image ${image.key}`, error))]
        : [],
    ),
  );
}
