import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { getEnv } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

const env = getEnv();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    accountType: string;
    emailVerified: boolean;
  };
  token?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  accountType: string;
  type: 'access' | 'refresh';
}

export function authMiddleware(required: boolean = true) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        throw new UnauthorizedError('Missing or invalid authorization header');
      }
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      
      if (decoded.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { 
          id: true, 
          email: true, 
          accountType: true, 
          emailVerified: true, 
          deletedAt: true 
        },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedError('User not found');
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.accountType,
        accountType: user.accountType,
        emailVerified: user.emailVerified,
      };
      req.token = token;
      
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  };
}

export function requireEmailVerified(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user?.emailVerified) {
    throw new ForbiddenError('Email verification required');
  }
  next();
}

export function requireRole(...accountTypes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !accountTypes.includes(req.user.accountType)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authMiddleware(false)(req, res, next);
}