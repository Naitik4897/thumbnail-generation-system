export enum JobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
}

export interface GoogleAuthPayload {
  credential?: string;
  code?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserMediaStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface PaginatedMediaJobsResponse {
  jobs: MediaJobDTO[];
  pagination: PaginationMeta;
  stats?: UserMediaStats;
}

export interface MediaJobDTO {
  id: string;
  userId: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  originalFilePath: string;
  thumbnailFilePath?: string | null;
  thumbnailUrl?: string | null;
  status: JobStatus;
  progress: number; // 0 to 100
  errorMessage?: string | null;
  durationInSeconds?: number | null;
  extractedFrameTimestamp?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThumbnailJobPayload {
  jobId: string;
  userId: string;
  originalFileName: string;
  originalFilePath: string;
  mimeType: string;
  mediaType: MediaType;
}

export interface JobProgressEvent {
  jobId: string;
  userId: string;
  status: JobStatus;
  progress: number;
  thumbnailUrl?: string;
  thumbnailFilePath?: string;
  errorMessage?: string;
  durationInSeconds?: number;
  extractedFrameTimestamp?: number;
}

// Socket.io event name constants
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  JOB_QUEUED: 'job:queued',
  JOB_UPDATED: 'job:updated',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
} as const;

// Queue constants
export const QUEUE_NAMES = {
  THUMBNAIL_PROCESSING: 'thumbnail-processing-queue',
} as const;

export const REDIS_CHANNELS = {
  JOB_UPDATES: 'channel:job-updates',
} as const;
