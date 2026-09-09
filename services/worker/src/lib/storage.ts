import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

export const UPLOADS_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR);
export const THUMBNAILS_DIR = path.resolve(process.cwd(), env.THUMBNAIL_DIR);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export class WorkerStorageService {
  static async uploadThumbnailToCloudinary(
    filePath: string,
    jobId: string
  ): Promise<string | null> {
    if (env.STORAGE_STRATEGY !== 'cloudinary' || !env.CLOUDINARY_CLOUD_NAME) {
      return null;
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: `thumbnails/${jobId}`,
        folder: 'thumbnail_system',
        overwrite: true,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (error) {
      console.error('[Worker Cloudinary Error]', error);
      return null;
    }
  }

  static getThumbnailPath(jobId: string): string {
    return path.join(THUMBNAILS_DIR, `thumb_${jobId}.jpg`);
  }
}
