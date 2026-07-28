import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env';

const env = getEnv();

const allowedOrigins = env.CORS_ORIGINS
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin) {
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    if (allowedOrigins.length > 0) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
