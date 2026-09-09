import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('mongodb+srv://<db_username>:VK9PkBdbGYoS0Eoj@cluster0.jsgceir.mongodb.net/?appName=Cluster0'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform((v) => parseInt(v, 10)),
  REDIS_PASSWORD: z.string().optional(),
  STORAGE_STRATEGY: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  THUMBNAIL_DIR: z.string().default('thumbnails'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CONCURRENCY: z.string().default('5').transform((v) => parseInt(v, 10)),
});

export const env = envSchema.parse(process.env);
