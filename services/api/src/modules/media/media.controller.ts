import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { addThumbnailJob } from '../../lib/queue';
import { determineMediaType } from '../../middleware/upload';
import { JobStatus, MediaType } from '@repo/types';
import { UPLOADS_DIR, THUMBNAILS_DIR } from '../../lib/storage';

export class MediaController {
  /**
   * Uploads multiple files (images/videos), creates DB records, enqueues BullMQ jobs,
   * and immediately responds with 202 Accepted and job identifiers.
   */
  static async uploadFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'No media files were uploaded' });
        return;
      }

      const createdJobs = [];

      for (const file of files) {
        const mediaType = determineMediaType(file.mimetype);

        // Create Database Record with status 'QUEUED'
        const mediaJob = await prisma.mediaJob.create({
          data: {
            userId,
            originalFileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            mediaType: mediaType as 'IMAGE' | 'VIDEO',
            originalFilePath: file.path,
            status: 'QUEUED',
            progress: 0,
          },
        });

        // Enqueue Job into BullMQ
        await addThumbnailJob({
          jobId: mediaJob.id,
          userId,
          originalFileName: mediaJob.originalFileName,
          originalFilePath: mediaJob.originalFilePath,
          mimeType: mediaJob.mimeType,
          mediaType: mediaType as MediaType,
        });

        createdJobs.push({
          id: mediaJob.id,
          userId: mediaJob.userId,
          originalFileName: mediaJob.originalFileName,
          fileSize: mediaJob.fileSize,
          mimeType: mediaJob.mimeType,
          mediaType: mediaJob.mediaType,
          status: mediaJob.status,
          progress: mediaJob.progress,
          createdAt: mediaJob.createdAt.toISOString(),
          updatedAt: mediaJob.updatedAt.toISOString(),
        });
      }

      res.status(202).json({
        success: true,
        message: `${createdJobs.length} file(s) accepted and queued for thumbnail generation.`,
        data: {
          jobs: createdJobs,
        },
      });
    } catch (error) {
      console.error('[MediaController.uploadFiles Error]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process file uploads',
      });
    }
  }

  /**
   * Fetches paginated media jobs for the authenticated user with status and type filters.
   */
  static async getUserJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '8', 10)));
      const skip = (page - 1) * limit;

      const mediaType = req.query.mediaType as string | undefined;
      const status = req.query.status as string | undefined;

      const whereClause: any = { userId };
      if (mediaType && ['IMAGE', 'VIDEO'].includes(mediaType)) {
        whereClause.mediaType = mediaType;
      }
      if (status && ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
        whereClause.status = status;
      }

      const [total, jobs, countsByStatus] = await Promise.all([
        prisma.mediaJob.count({ where: whereClause }),
        prisma.mediaJob.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.mediaJob.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true },
        }),
      ]);

      const stats = {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      };

      for (const group of countsByStatus) {
        const count = group._count.status;
        if (group.status === 'QUEUED') stats.queued = count;
        else if (group.status === 'PROCESSING') stats.processing = count;
        else if (group.status === 'COMPLETED') stats.completed = count;
        else if (group.status === 'FAILED') stats.failed = count;
        stats.total += count;
      }

      const totalPages = Math.ceil(total / limit) || 1;

      const formattedJobs = jobs.map((job) => ({
        ...job,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: {
          jobs: formattedJobs,
          stats,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      });
    } catch (error) {
      console.error('[MediaController.getUserJobs Error]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media jobs',
      });
    }
  }

  /**
   * Fetches a single job details.
   */
  static async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const id = req.params.id as string;

      const job = await prisma.mediaJob.findFirst({
        where: { id, userId },
      });

      if (!job) {
        res.status(404).json({ success: false, message: 'Media job not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          job: {
            ...job,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('[MediaController.getJobById Error]', error);
      res.status(500).json({ success: false, message: 'Failed to fetch job' });
    }
  }

  /**
   * Serves thumbnail image directly or redirects if hosted on Cloudinary.
   */
  static async getThumbnail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const job = await prisma.mediaJob.findUnique({
        where: { id },
      });

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found' });
        return;
      }

      if (job.status !== 'COMPLETED') {
        res.status(400).json({
          success: false,
          message: `Thumbnail not ready. Current status is ${job.status}`,
        });
        return;
      }

      if (job.thumbnailUrl && job.thumbnailUrl.startsWith('http')) {
        res.redirect(job.thumbnailUrl);
        return;
      }

      if (job.thumbnailFilePath && fs.existsSync(job.thumbnailFilePath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(job.thumbnailFilePath).pipe(res);
        return;
      }

      res.status(404).json({ success: false, message: 'Thumbnail file missing on disk' });
    } catch (error) {
      console.error('[MediaController.getThumbnail Error]', error);
      res.status(500).json({ success: false, message: 'Error retrieving thumbnail' });
    }
  }

  /**
   * Downloads original file or thumbnail.
   */
  static async downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const type = req.query.type === 'thumbnail' ? 'thumbnail' : 'original';

      const job = await prisma.mediaJob.findUnique({
        where: { id },
      });

      if (!job) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
      }

      const filePath = type === 'thumbnail' ? job.thumbnailFilePath : job.originalFilePath;
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: `${type} file not found on disk` });
        return;
      }

      const downloadName =
        type === 'thumbnail'
          ? `thumbnail_${path.parse(job.originalFileName).name}.jpg`
          : job.originalFileName;

      res.download(filePath, downloadName);
    } catch (error) {
      console.error('[MediaController.downloadFile Error]', error);
      res.status(500).json({ success: false, message: 'Error downloading file' });
    }
  }
}
