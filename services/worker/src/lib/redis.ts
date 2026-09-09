import Redis from 'ioredis';
import { env } from '../config/env';
import { JobProgressEvent, REDIS_CHANNELS } from '@repo/types';

const isTls =
  env.REDIS_HOST.includes('upstash.io') ||
  env.REDIS_HOST.startsWith('rediss://') ||
  process.env.REDIS_TLS === 'true';

const parsedHost = env.REDIS_HOST.replace(/^rediss?:\/\//, '').split('@').pop()?.split(':')[0] || env.REDIS_HOST;

export const redisConfig = {
  host: parsedHost,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isTls ? { tls: {} } : {}),
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
