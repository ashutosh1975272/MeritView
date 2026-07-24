import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env';

const env = getEnv();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  env.NEXT_PUBLIC_APP_URL ? env.NEXT_PUBLIC_APP_URL : '',
].filter(Boolean);

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
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

export function corsOptions(): void {
  // For preflight requests
}