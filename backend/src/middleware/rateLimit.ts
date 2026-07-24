import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { getEnv } from '../config/env';
import { RateLimitError } from '../utils/errors';

const env = getEnv();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix, skipSuccessfulRequests, skipFailedRequests } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}:${req.ip}:${req.path}`;
    const windowSec = Math.ceil(windowMs / 1000);
    
    try {
      const current = parseInt(String(await redis.incr(key)), 10);
      
      if (current === 1) {
        await redis.setex(key, windowSec, current.toString());
      }

      const ttl = await redis.ttl(key);
      const resetTime = Math.floor(Date.now() / 1000) + ttl;

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (current > maxRequests) {
        const retryAfter = ttl > 0 ? ttl : windowSec;
        res.setHeader('Retry-After', retryAfter.toString());
        throw new RateLimitError('Too many requests', retryAfter);
      }

      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function (body?: any) {
          const statusCode = res.statusCode;
          const shouldSkip = 
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400);
          
          if (shouldSkip) {
            redis.decr(key);
          }
          
          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const generalRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: 'ratelimit:general',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 5,
  keyPrefix: 'ratelimit:auth',
  skipSuccessfulRequests: true,
});

export const registerRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 3,
  keyPrefix: 'ratelimit:register',
});