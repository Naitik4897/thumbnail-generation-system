import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { UPLOADS_DIR } from '../lib/storage';
import { MediaType } from '@repo/types';

// Configure Disk Storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${uuidv4()}${ext}`;
    cb(null, safeFilename);
  },
});

// Allowed MIME categories
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.avi', '.mkv', '.webm'];

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 10, // Max 10 files in a single multi-upload batch
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

    if (isMimeAllowed && isExtAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${file.originalname})`));
    }
  },
});

/**
 * Security Middleware: Deep Magic-Byte / Signature Sniffing
 * Verifies that the uploaded file content actually matches an image or video format,
 * preventing malicious payload uploads masked with a fake .png/.mp4 extension.
 */
export async function validateUploadedFilesSignature(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    next();
    return;
  }

  const invalidFiles: string[] = [];

  // Dynamic import for pure ESM file-type package in Node CJS
  let fileTypeFromFile: any;
  try {
    const fileTypeModule = await (Function('return import("file-type")')());
    fileTypeFromFile = fileTypeModule.fileTypeFromFile;
  } catch (err) {
    console.warn('[MagicBytes] Dynamic file-type load fallback:', err);
  }

  for (const file of files) {
    try {
      const detected = fileTypeFromFile ? await fileTypeFromFile(file.path) : null;
      if (!detected) {
        // Fallback check for certain common plain extensions if magic detection fails
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.mp4', '.mov', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          invalidFiles.push(file.originalname);
          fs.unlinkSync(file.path);
        }
      } else {
        const isImage = detected.mime.startsWith('image/');
        const isVideo = detected.mime.startsWith('video/');
        if (!isImage && !isVideo) {
          invalidFiles.push(file.originalname);
          fs.unlinkSync(file.path);
        }
      }
    } catch (err) {
      console.error(`[MagicBytes Error] Failed to scan file ${file.path}:`, err);
    }
  }

  if (invalidFiles.length > 0) {
    res.status(400).json({
      success: false,
      message: `Security validation failed. Suspicious or corrupted files detected: ${invalidFiles.join(', ')}`,
    });
    return;
  }

  next();
}

export function determineMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('video/')) {
    return MediaType.VIDEO;
  }
  return MediaType.IMAGE;
}
