import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refreshTokens, logoutUser } from '../../../services/auth';
import { prisma } from '../../../db/prisma';
import { redis } from '../../../config/redis';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../../utils/errors';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    dispute: { findFirst: vi.fn() },
  },
}));

vi.mock('../../../config/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    keys: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

describe('T1.2.2.13: Refresh token rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invalidate old refresh token and issue new one', async () => {
    const oldTokenData = JSON.stringify({ userId: 'user_rot', tokenId: 'token_old' });
    (redis.get as any).mockResolvedValue(oldTokenData);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_rot',
      email: 'rot@example.com',
      accountType: 'STANDARD',
      emailVerified: true,
      deletedAt: null,
    });
    (redis.del as any).mockResolvedValue(1);
    (jwt.sign as any).mockReturnValue('new_access_token');
    (redis.setex as any).mockResolvedValue('OK');

    const result = await refreshTokens('old_refresh_token');

    expect(redis.del).toHaveBeenCalledWith(expect.stringMatching(/^refresh:/));
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^refresh:/),
      604800,
      expect.any(String)
    );
    expect(result.accessToken).toBe('new_access_token');
    expect(result.refreshToken).toBeDefined();
  });

  it('should prevent reuse of old token after rotation', async () => {
    (redis.get as any).mockResolvedValueOnce(JSON.stringify({ userId: 'user_rot', tokenId: 'token_1' }));
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_rot',
      email: 'rot@example.com',
      accountType: 'STANDARD',
      emailVerified: true,
      deletedAt: null,
    });
    (redis.del as any).mockResolvedValue(1);
    (jwt.sign as any).mockReturnValue('new_access');
    (redis.setex as any).mockResolvedValue('OK');

    await refreshTokens('old_refresh_token');

    (redis.get as any).mockResolvedValue(null);

    await expect(refreshTokens('old_refresh_token')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw for invalid refresh token', async () => {
    (redis.get as any).mockResolvedValue(null);

    await expect(refreshTokens('invalid_token')).rejects.toThrow(UnauthorizedError);
  });
});
