import { Router } from 'express';
import { MediaController } from './media.controller';
import { authMiddleware } from '../../middleware/auth';
import { upload, validateUploadedFilesSignature } from '../../middleware/upload';

const router = Router();

// Multi-file Upload Endpoint (Protected)
router.post(
  '/upload',
  authMiddleware,
  upload.array('files', 10),
  validateUploadedFilesSignature,
  MediaController.uploadFiles
);

// Get all jobs for current user
router.get('/jobs', authMiddleware, MediaController.getUserJobs);

// Get specific job status
router.get('/jobs/:id', authMiddleware, MediaController.getJobById);

// Stream / view thumbnail
router.get('/thumbnails/:id', MediaController.getThumbnail);

// Download file (thumbnail or original)
router.get('/download/:id', authMiddleware, MediaController.downloadFile);

export const mediaRoutes = router;
