import { Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from './auth';
import { ForbiddenError } from '../utils/errors';

export function adminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const auth = authMiddleware();
  auth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (!req.user || req.user.role !== 'ADMIN') {
      return next(new ForbiddenError('Admin access required'));
    }
    next();
  });
}
