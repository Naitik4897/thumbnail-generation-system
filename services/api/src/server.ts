import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { SocketGateway } from './sockets/socket.gateway';
import { UPLOADS_DIR, THUMBNAILS_DIR } from './lib/storage';

export function createServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Security Middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: [env.FRONTEND_URL, 'http://localhost:3000', '*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    })
  );

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static storage serving
  app.use('/static/uploads', express.static(UPLOADS_DIR));
  app.use('/static/thumbnails', express.static(THUMBNAILS_DIR));

  // Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/media', mediaRoutes);

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An unexpected internal error occurred',
    });
  });

  // Initialize Socket.io Server
  SocketGateway.initialize(httpServer);

  return { app, httpServer };
}
