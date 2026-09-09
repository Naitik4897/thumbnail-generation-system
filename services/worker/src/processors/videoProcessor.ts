import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import { WorkerStorageService } from '../lib/storage';

// Set binary paths from installers if not running in container with system ffmpeg
if (ffmpegInstaller.path) {
  try {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  } catch (err) {
    console.warn('[VideoProcessor] Could not set ffmpeg installer path, relying on system PATH');
  }
}

if (ffprobeInstaller.path) {
  try {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  } catch (err) {
    console.warn('[VideoProcessor] Could not set ffprobe installer path, relying on system PATH');
  }
}

export interface VideoProcessingResult {
  thumbnailFilePath: string;
  thumbnailUrl: string | null;
  durationInSeconds: number;
  extractedFrameTimestamp: number;
}

export class VideoProcessor {
  /**
   * Retrieves video duration in seconds using ffprobe metadata.
   */
  static getVideoDuration(inputFilePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputFilePath, (err, metadata) => {
        if (err) {
          return reject(new Error(`FFprobe failed: ${err.message}`));
        }
        const duration = metadata.format.duration || 0;
        resolve(Number(duration));
      });
    });
  }

  /**
   * Calculates mid-point timestamp, extracts the frame, resizes to 128x128,
   * and saves the resulting thumbnail.
   */
  static async process(
    jobId: string,
    inputFilePath: string
  ): Promise<VideoProcessingResult> {
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Input video file not found at path: ${inputFilePath}`);
    }

    const duration = await this.getVideoDuration(inputFilePath);
    // Mid-point timestamp (50% timestamp)
    const midPointTimestamp = duration > 0 ? duration / 2 : 0;
    const outputFilePath = WorkerStorageService.getThumbnailPath(jobId);
    const outputDir = path.dirname(outputFilePath);
    const outputFilename = path.basename(outputFilePath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFilePath)
        // Fast seek to mid-point
        .seekInput(midPointTimestamp)
        .outputOptions([
          '-vframes 1',
          '-vf scale=128:128:force_original_aspect_ratio=increase:flags=lanczos,crop=128:128,unsharp=5:5:1.2:5:5:0.0',
          '-q:v 1',
        ])
        .output(outputFilePath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg extraction failed: ${err.message}`));
        })
        .run();
    });

    const thumbnailUrl = await WorkerStorageService.uploadThumbnailToCloudinary(
      outputFilePath,
      jobId
    );

    return {
      thumbnailFilePath: outputFilePath,
      thumbnailUrl: thumbnailUrl || null,
      durationInSeconds: duration,
      extractedFrameTimestamp: midPointTimestamp,
    };
  }
}
