import Redis from 'ioredis';
import { env } from '../config/env';

const isTls =
  env.REDIS_HOST.includes('upstash.io') ||
  env.REDIS_HOST.startsWith('rediss://') ||
  process.env.REDIS_TLS === 'true';

const parsedHost = env.REDIS_HOST.replace(/^rediss?:\/\//, '').split('@').pop()?.split(':')[0] || env.REDIS_HOST;

export const redisConfig = {
  host: parsedHost,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  ...(isTls ? { tls: {} } : {}),
};

// Redis client for general caching / connection
export const redisClient = new Redis(redisConfig);

// Dedicated Redis Subscriber for Pub/Sub Socket events
export const redisSubscriber = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully to Redis server');
});

redisClient.on('error', (err) => {
  console.error('[Redis Error]', err);
});
