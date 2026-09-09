import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

// Ensure upload & thumbnail local directories exist
export const UPLOADS_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR);
export const THUMBNAILS_DIR = path.resolve(process.cwd(), env.THUMBNAIL_DIR);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// Configure Cloudinary if credentials provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export class StorageService {
  /**
   * Upload file to Cloudinary if configured, otherwise returns local URL.
   */
  static async uploadThumbnailToCloudinary(
    filePath: string,
    publicId: string
  ): Promise<string | null> {
    if (env.STORAGE_STRATEGY !== 'cloudinary' || !env.CLOUDINARY_CLOUD_NAME) {
      return null;
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: `thumbnails/${publicId}`,
        folder: 'thumbnail_system',
        overwrite: true,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (error) {
      console.error('[Cloudinary Upload Error]', error);
      return null;
    }
  }

  static getLocalFilePath(filename: string, isThumbnail = false): string {
    return path.join(isThumbnail ? THUMBNAILS_DIR : UPLOADS_DIR, filename);
  }

  static deleteLocalFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[Storage] Failed to delete file at ${filePath}`, err);
    }
  }
}
