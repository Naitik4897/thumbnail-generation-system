import Redis from 'ioredis';
import { env } from '../config/env';

export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
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
