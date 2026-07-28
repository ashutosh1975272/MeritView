import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ForbiddenError } from '../utils/errors';

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (req.user.accountType !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }

  next();
}

export function auditorMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (req.user.accountType !== 'ADMIN' && req.user.accountType !== 'AUDITOR') {
    throw new ForbiddenError('Admin or auditor access required');
  }

  next();
}

export function supportMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (req.user.accountType !== 'SUPPORT' && req.user.accountType !== 'ADMIN') {
    throw new ForbiddenError('Support access required');
  }

  next();
}
