import Redis from 'ioredis';
import { env } from '../config/env';
import { JobProgressEvent, REDIS_CHANNELS } from '@repo/types';

export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Publisher connection to emit status updates
export const redisPublisher = new Redis(redisConfig);

export async function publishJobProgress(event: JobProgressEvent): Promise<void> {
  try {
    await redisPublisher.publish(
      REDIS_CHANNELS.JOB_UPDATES,
      JSON.stringify(event)
    );
  } catch (error) {
    console.error('[Redis Publisher Error] Failed to publish job progress:', error);
  }
}
