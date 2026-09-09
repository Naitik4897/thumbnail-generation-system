import { Queue } from 'bullmq';
import { QUEUE_NAMES, ThumbnailJobPayload } from '@repo/types';
import { redisConfig } from './redis';

export const thumbnailQueue = new Queue<ThumbnailJobPayload>(
  QUEUE_NAMES.THUMBNAIL_PROCESSING,
  {
    connection: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 500, // Keep last 500 completed jobs for history/debugging
      },
      removeOnFail: {
        count: 500,
      },
    },
  }
);

/**
 * Enqueue a thumbnail processing job.
 * Note: We attach the userId to the job name or custom group for FIFO concurrency.
 */
export async function addThumbnailJob(payload: ThumbnailJobPayload) {
  const job = await thumbnailQueue.add(
    `thumbnail:${payload.userId}:${payload.jobId}`,
    payload,
    {
      jobId: payload.jobId,
    }
  );
  return job;
}
