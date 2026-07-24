import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError, 
  ConflictError, 
  RateLimitError,
  InternalError 
} from '../utils/errors';

const env = getEnv();

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    documentationUrl: string;
  };
}

function getDocumentationUrl(code: string): string {
  return `https://docs.meritview.app/errors/${code.toLowerCase().replace(/_/g, '-')}`;
}

function formatErrorResponse(error: AppError, requestId: string): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      requestId,
      documentationUrl: getDocumentationUrl(error.code),
    },
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';
  
  if (err instanceof AppError) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', err.retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', '100');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + err.retryAfter).toString());
    }
    
    const statusCode = err.statusCode;
    const response = formatErrorResponse(err, requestId);
    
    if (!err.isOperational) {
      logger.error('Operational error', err, { code: err.code, details: err.details }, requestId);
    } else {
      logger.warn('Client error', { code: err.code, message: err.message }, requestId);
    }
    
    res.status(statusCode).json(response);
    return;
  }
  
  if (err.name === 'ZodError') {
    const zodError = err as any;
    const validationError = new ValidationError(
      'Validation failed',
      zodError.flatten().fieldErrors
    );
    const response = formatErrorResponse(validationError, requestId);
    res.status(400).json(response);
    return;
  }
  
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      const conflictError = new ConflictError('A record with this value already exists', {
        field: prismaError.meta?.target,
      });
      const response = formatErrorResponse(conflictError, requestId);
      res.status(409).json(response);
      return;
    }
  }
  
  logger.error('Unhandled error', err, undefined, requestId);
  
  const internalError = new InternalError(
    env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  );
  const response = formatErrorResponse(internalError, requestId);
  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.requestId || 'unknown';
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  const response = formatErrorResponse(error, requestId);
  res.status(404).json(response);
}