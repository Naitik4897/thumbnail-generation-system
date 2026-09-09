import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from root or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('mongodb+srv://<db_username>:VK9PkBdbGYoS0Eoj@cluster0.jsgceir.mongodb.net/?appName=Cluster0'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform((v) => parseInt(v, 10)),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().default('super_secret_jwt_key_change_in_production_987654321'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  STORAGE_STRATEGY: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  THUMBNAIL_DIR: z.string().default('thumbnails'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MAX_FILE_SIZE_MB: z.string().default('100').transform((v) => parseInt(v, 10)),
});

export const env = envSchema.parse(process.env);
