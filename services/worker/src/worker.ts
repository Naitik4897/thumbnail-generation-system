import { Worker, Job } from 'bullmq';
import {
  JobProgressEvent,
  JobStatus,
  MediaType,
  QUEUE_NAMES,
  ThumbnailJobPayload,
} from '@repo/types';
import { env } from './config/env';
import { redisConfig, publishJobProgress } from './lib/redis';
import { prisma } from './lib/prisma';
import { ImageProcessor } from './processors/imageProcessor';
import { VideoProcessor } from './processors/videoProcessor';
import { UserExecutionLock } from './locks/userLock';

export function createThumbnailWorker(): Worker<ThumbnailJobPayload> {
  const worker = new Worker<ThumbnailJobPayload>(
    QUEUE_NAMES.THUMBNAIL_PROCESSING,
    async (job: Job<ThumbnailJobPayload>) => {
      const { jobId, userId, originalFileName, originalFilePath, mediaType } = job.data;
      console.log(`\n[Worker] Starting job ${jobId} for user ${userId} (${originalFileName} - ${mediaType})`);

      let lockToken: string | null = null;

      try {
        // Enforce Per-User FIFO Serialization: Wait until previous jobs of this user finish
        lockToken = await UserExecutionLock.acquireWithWait(userId, jobId, 60000);

        // 1. Transition to PROCESSING state
        await prisma.mediaJob.update({
          where: { id: jobId },
          data: {
            status: 'PROCESSING',
            progress: 25,
          },
        });

        await publishJobProgress({
          jobId,
          userId,
          status: JobStatus.PROCESSING,
          progress: 25,
        });

        let thumbnailFilePath: string;
        let thumbnailUrl: string | null = null;
        let durationInSeconds: number | undefined;
        let extractedFrameTimestamp: number | undefined;

        // 2. Process Media according to type
        if (mediaType === MediaType.VIDEO) {
          console.log(`[Worker] Extracting midpoint frame from video for job ${jobId}...`);
          const videoResult = await VideoProcessor.process(jobId, originalFilePath);
          thumbnailFilePath = videoResult.thumbnailFilePath;
          thumbnailUrl = videoResult.thumbnailUrl;
          durationInSeconds = videoResult.durationInSeconds;
          extractedFrameTimestamp = videoResult.extractedFrameTimestamp;
        } else {
          console.log(`[Worker] Generating 128x128 image thumbnail for job ${jobId}...`);
          const imageResult = await ImageProcessor.process(jobId, originalFilePath);
          thumbnailFilePath = imageResult.thumbnailFilePath;
          thumbnailUrl = imageResult.thumbnailUrl;
        }

        // 3. Mark as COMPLETED in Database
        const updatedJob = await prisma.mediaJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            thumbnailFilePath,
            thumbnailUrl: thumbnailUrl || `/static/thumbnails/thumb_${jobId}.jpg`,
            durationInSeconds: durationInSeconds || undefined,
            extractedFrameTimestamp: extractedFrameTimestamp || undefined,
            errorMessage: null,
          },
        });

        // 4. Publish COMPLETED Realtime Event
        await publishJobProgress({
          jobId,
          userId,
          status: JobStatus.COMPLETED,
          progress: 100,
          thumbnailUrl: updatedJob.thumbnailUrl || `/static/thumbnails/thumb_${jobId}.jpg`,
          thumbnailFilePath,
          durationInSeconds,
          extractedFrameTimestamp,
        });

        console.log(`✅ [Worker] Successfully generated thumbnail for job ${jobId}`);
        return { success: true, jobId, thumbnailFilePath };
      } catch (error: any) {
        console.error(`❌ [Worker Error] Processing failed for job ${jobId}:`, error);

        const errorMessage = error?.message || 'Unknown thumbnail processing error';

        // Update DB to FAILED
        await prisma.mediaJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            progress: 0,
            errorMessage,
          },
        }).catch((dbErr) => console.error('[DB Update Error on Failure]', dbErr));

        // Publish FAILED Realtime Event
        await publishJobProgress({
          jobId,
          userId,
          status: JobStatus.FAILED,
          progress: 0,
          errorMessage,
        });

        throw error;
      } finally {
        // Always release the Per-User lock
        if (lockToken) {
          await UserExecutionLock.release(userId, lockToken);
        }
      }
    },
    {
      connection: redisConfig,
      concurrency: env.CONCURRENCY,
    }
  );

  worker.on('ready', () => {
    console.log(`⚡ [Worker Engine] BullMQ Worker listening on queue '${QUEUE_NAMES.THUMBNAIL_PROCESSING}' (Concurrency: ${env.CONCURRENCY})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker Job Failed] Job ID: ${job?.id}, Error: ${err.message}`);
  });

  return worker;
}
