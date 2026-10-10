import { v2 as cloudinary } from 'cloudinary';
import type { StoredImage } from '@/models/shared';
import type { ImageStorage } from './types';

let configured = false;

function client() {
  if (!configured) {
    // Read the settings ourselves rather than relying on the SDK, which only looks at
    // CLOUDINARY_URL once, when it's first imported (before scripts have loaded .env).
    const url = process.env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (url) {
      cloudinary.config({ api_key: url[1], api_secret: url[2], cloud_name: url[3] });
    } else if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
    cloudinary.config({ secure: true });
    configured = true;
  }
  return cloudinary;
}

export const cloudinaryStorage: ImageStorage = {
  save(file, folder) {
    const root = process.env.CLOUDINARY_FOLDER || 'adonic';
    return new Promise<StoredImage>((resolve, reject) => {
      client()
        .uploader.upload_stream(
          {
            folder: `${root}/${folder}`,
            resource_type: 'image',
            // Cap huge uploads; smaller sizes come from Cloudinary URL transformations.
            transformation: [{ width: 2400, height: 2400, crop: 'limit' }],
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
            resolve({ url: result.secure_url, key: result.public_id, width: result.width, height: result.height });
          },
        )
        .end(Buffer.from(file.bytes));
    });
  },

  async remove(key) {
    await client().uploader.destroy(key, { resource_type: 'image', invalidate: true });
  },
};
