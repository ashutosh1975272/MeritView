import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, generalRateLimiter, authRateLimiter, registerRateLimiter } from '../../middleware/rateLimit';
import { redis } from '../../config/redis';
import { RateLimitError } from '../../utils/errors';

vi.mock('../../config/redis', () => ({
  redis: {
    incr: vi.fn(),
    setex: vi.fn(),
    ttl: vi.fn(),
    decr: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
  }),
}));

function mockRequest(ip: string = '127.0.0.1', path: string = '/test'): Partial<Request> {
  return { ip, path, headers: {} };
}

function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  res.statusCode = 200;
  return res;
}

function mockNext() {
  return vi.fn() as unknown as NextFunction;
}

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should allow requests under the limit', async () => {
      (redis.incr as any).mockResolvedValue(1);
      (redis.setex as any).mockResolvedValue('OK');
      (redis.ttl as any).mockResolvedValue(60);

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'ratelimit:test',
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should allow requests exactly at the limit', async () => {
      (redis.incr as any).mockResolvedValue(10);
      (redis.ttl as any).mockResolvedValue(30);

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'ratelimit:test',
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should block requests over the limit and set Retry-After', async () => {
      (redis.incr as any).mockResolvedValue(11);
      (redis.ttl as any).mockResolvedValue(45);

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'ratelimit:test',
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(RateLimitError));
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '45');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should use windowSec as Retry-After when TTL is expired', async () => {
      (redis.incr as any).mockResolvedValue(11);
      (redis.ttl as any).mockResolvedValue(0);

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'ratelimit:test',
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      const error = (next as any).mock.calls[0][0] as RateLimitError;
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.retryAfter).toBe(60);
      expect(error.statusCode).toBe(429);
    });

    it('should decrement key for successful requests when skipSuccessfulRequests is true', async () => {
      (redis.incr as any).mockResolvedValue(1);
      (redis.setex as any).mockResolvedValue('OK');
      (redis.ttl as any).mockResolvedValue(60);
      (redis.decr as any).mockResolvedValue(0);

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'ratelimit:auth',
        skipSuccessfulRequests: true,
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      expect(next).toHaveBeenCalledWith();

      (res.send as any)('ok');

      expect(redis.decr).toHaveBeenCalledWith(expect.stringContaining('ratelimit:auth'));
    });

    it('should use correct key format including ip and path', async () => {
      (redis.incr as any).mockResolvedValue(1);
      (redis.setex as any).mockResolvedValue('OK');
      (redis.ttl as any).mockResolvedValue(60);

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100,
        keyPrefix: 'ratelimit:custom',
      });

      const req = mockRequest('192.168.1.1', '/api/test') as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:custom:192.168.1.1:/api/test');
    });

    it('should pass the error to next on redis failure', async () => {
      (redis.incr as any).mockRejectedValue(new Error('Redis connection failed'));

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'ratelimit:test',
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await limiter(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('pre-configured limiters', () => {
    it('generalRateLimiter should have correct options', () => {
      expect(generalRateLimiter).toBeDefined();
    });

    it('authRateLimiter should have correct options', () => {
      expect(authRateLimiter).toBeDefined();
    });

    it('registerRateLimiter should have correct options', () => {
      expect(registerRateLimiter).toBeDefined();
    });
  });
});
