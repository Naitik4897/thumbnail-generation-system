import sharp from 'sharp';
import fs from 'fs';
import { WorkerStorageService } from '../lib/storage';

export interface ImageProcessingResult {
  thumbnailFilePath: string;
  thumbnailUrl: string | null;
}

export class ImageProcessor {
  /**
   * Resizes an input image to a 128x128 thumbnail with cover fit and high compression efficiency.
   */
  static async process(
    jobId: string,
    inputFilePath: string
  ): Promise<ImageProcessingResult> {
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Input image file not found at path: ${inputFilePath}`);
    }

    const outputFilePath = WorkerStorageService.getThumbnailPath(jobId);

    // Sharp processing pipeline: High-Fidelity Lanczos3 Downsampling + Unsharp Masking + 4:4:4 Chroma
    await sharp(inputFilePath)
      .resize(128, 128, {
        fit: 'cover',
        position: 'center',
        kernel: 'lanczos3', // High-fidelity Lanczos resampling
      })
      .sharpen({
        sigma: 1.2,
        m1: 1.5,
        m2: 0.7,
      })
      .jpeg({
        quality: 95,
        chromaSubsampling: '4:4:4', // Disables color compression for sharp text & clean UI edges
        mozjpeg: true,
      })
      .toFile(outputFilePath);

    // Upload to Cloudinary if enabled
    const thumbnailUrl = await WorkerStorageService.uploadThumbnailToCloudinary(
      outputFilePath,
      jobId
    );

    return {
      thumbnailFilePath: outputFilePath,
      thumbnailUrl: thumbnailUrl || null,
    };
  }
}
