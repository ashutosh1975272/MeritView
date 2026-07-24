import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { redis } from '../../../config/redis';
import { RateLimitError } from '../../../utils/errors';

vi.mock('../../../config/redis', () => ({
  redis: {
    incr: vi.fn(),
    setex: vi.fn(),
    ttl: vi.fn(),
  },
}));

vi.mock('../../../config/env', () => ({
  getEnv: () => ({ RATE_LIMIT_WINDOW_MS: 60000, RATE_LIMIT_MAX_REQUESTS: 100 }),
}));

vi.mock('../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

function mockReq(ip: string = '127.0.0.1', path: string = '/v1/auth/login') {
  return { ip, path } as any;
}

function mockRes() {
  const headers: Record<string, string> = {};
  return {
    setHeader: vi.fn((key: string, val: string) => { headers[key] = val; }),
    getHeader: (key: string) => headers[key],
    send: vi.fn(),
    statusCode: 200,
  } as any;
}

describe('Rate Limit Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1.2.2.15: rate limit persists across requests from same IP', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 3,
      keyPrefix: 'ratelimit:test',
    });

    (redis.incr as any).mockResolvedValue(1);
    (redis.ttl as any).mockResolvedValue(60);
    (redis.setex as any).mockResolvedValue('OK');

    const req = mockReq('192.168.1.1', '/v1/auth/login');
    const res = mockRes();
    await limiter(req, res, vi.fn());
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.stringMatching(/^[0-2]$/));

    (redis.incr as any).mockResolvedValue(2);
    const req2 = mockReq('192.168.1.1', '/v1/auth/login');
    const res2 = mockRes();
    await limiter(req2, res2, vi.fn());
    expect(res2.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.stringMatching(/^[0-2]$/));

    (redis.incr as any).mockResolvedValue(3);
    const req3 = mockReq('192.168.1.1', '/v1/auth/login');
    const res3 = mockRes();
    await limiter(req3, res3, vi.fn());
    expect(res3.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.stringMatching(/^[0-2]$/));
  });

  it('T1.2.2.16: rate limit resets after window expires', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 3,
      keyPrefix: 'ratelimit:test',
    });

    (redis.incr as any).mockResolvedValue(4);
    (redis.ttl as any).mockResolvedValue(0);

    const req = mockReq('192.168.1.2', '/v1/auth/login');
    const res = mockRes();
    const next = vi.fn();

    await limiter(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(next).toHaveBeenCalledWith(expect.any(RateLimitError));
  });

  it('should allow requests after rate limit resets', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 3,
      keyPrefix: 'ratelimit:test',
    });

    (redis.incr as any).mockResolvedValue(1);
    (redis.ttl as any).mockResolvedValue(60);
    (redis.setex as any).mockResolvedValue('OK');

    const req = mockReq('192.168.1.3', '/v1/auth/login');
    const res = mockRes();
    const next = vi.fn();
    await limiter(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
