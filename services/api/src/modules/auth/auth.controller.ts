import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AuthenticatedRequest } from '../../middleware/auth';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { email, password, name } = validation.data;

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
        });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name: name || undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            ...user,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (error) {
      console.error('[AuthController.register Error]', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { email, password } = validation.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials',
        });
        return;
      }

      if (!user.password) {
        res.status(401).json({
          success: false,
          message: 'This account was registered with Google. Please use Google Sign In.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials',
        });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
      );

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (error) {
      console.error('[AuthController.login Error]', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
      });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('[AuthController.getMe Error]', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Google OAuth2 Login / Register Handler
   */
  static async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { credential, email: mockEmail, name: mockName, googleId: mockGoogleId } = req.body;

      let email = mockEmail;
      let name = mockName;
      let googleId = mockGoogleId;
      let avatarUrl: string | undefined;

      if (credential) {
        // Decode Google ID Token (JWT)
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          email = payload.email;
          name = payload.name;
          googleId = payload.sub;
          avatarUrl = payload.picture;
        }
      }

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Google authentication failed: Email is missing in token',
        });
        return;
      }

      // Upsert User by email or googleId
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            ...(googleId ? [{ googleId }] : []),
          ],
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            name: name || undefined,
            googleId: googleId || undefined,
            avatarUrl: avatarUrl || undefined,
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId || user.googleId || undefined,
            name: name || user.name || undefined,
            avatarUrl: avatarUrl || user.avatarUrl || undefined,
          },
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
      );

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (error) {
      console.error('[AuthController.googleAuth Error]', error);
      res.status(500).json({
        success: false,
        message: 'Google authentication failed on server',
      });
    }
  }
}
