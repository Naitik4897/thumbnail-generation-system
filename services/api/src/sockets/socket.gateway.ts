import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redisSubscriber } from '../lib/redis';
import { JobProgressEvent, REDIS_CHANNELS, SOCKET_EVENTS } from '@repo/types';

export class SocketGateway {
  private static io: SocketIOServer | null = null;

  public static initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Authentication Middleware for WebSocket Connections
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.split(' ')[1] ||
          (socket.handshake.query?.token as string);

        if (!token) {
          return next(new Error('Authentication token missing'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as {
          id: string;
          email: string;
        };

        socket.data.userId = decoded.id;
        socket.data.email = decoded.email;
        next();
      } catch (err) {
        return next(new Error('Invalid WebSocket authentication token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const userRoom = `user:${userId}`;

      socket.join(userRoom);
      console.log(`[Socket.io] User connected: ${userId} (Socket: ${socket.id}) -> Joined Room: ${userRoom}`);

      socket.on('disconnect', (reason) => {
        console.log(`[Socket.io] User disconnected: ${userId} (${reason})`);
      });
    });

    // Subscribe to Redis Pub/Sub for worker events
    this.subscribeToRedisUpdates();

    return this.io;
  }

  /**
   * Listens to Redis pub/sub channel where Worker publishes job status updates,
   * then pushes updates to the targeted user room.
   */
  private static subscribeToRedisUpdates(): void {
    redisSubscriber.subscribe(REDIS_CHANNELS.JOB_UPDATES, (err) => {
      if (err) {
        console.error('[Redis PubSub] Failed to subscribe to job updates channel:', err);
      } else {
        console.log(`[Redis PubSub] Subscribed to ${REDIS_CHANNELS.JOB_UPDATES}`);
      }
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === REDIS_CHANNELS.JOB_UPDATES && this.io) {
        try {
          const event: JobProgressEvent = JSON.parse(message);
          const userRoom = `user:${event.userId}`;

          // Emit to the specific user's connected dashboard tabs
          this.io.to(userRoom).emit(SOCKET_EVENTS.JOB_UPDATED, event);
          console.log(`[Socket.io] Broadcasted job update to ${userRoom}: Job ${event.jobId} -> ${event.status} (${event.progress}%)`);
        } catch (error) {
          console.error('[Redis PubSub] Failed to process message:', error);
        }
      }
    });
  }

  public static getIO(): SocketIOServer | null {
    return this.io;
  }
}
