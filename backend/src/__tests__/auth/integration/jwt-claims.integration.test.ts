import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../../../db/prisma';
import { verifyAccessToken } from '../../../services/auth';
import { UnauthorizedError } from '../../../utils/errors';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../config/redis', () => ({
  redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn(), del: vi.fn(), keys: vi.fn() },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('jsonwebtoken', () => {
  const MockTokenExpiredError = class extends Error {
    expiredAt: Date = new Date();
    constructor(message: string) {
      super(message);
      this.name = 'TokenExpiredError';
    }
  };
  const MockJsonWebTokenError = class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  };
  return {
    sign: vi.fn(),
    verify: vi.fn(),
    TokenExpiredError: MockTokenExpiredError,
    JsonWebTokenError: MockJsonWebTokenError,
  };
});

describe('T1.2.2.12: JWT payload claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid access token with STANDARD role', async () => {
    (jwt.verify as any).mockReturnValue({
      userId: 'user_std',
      email: 'std@example.com',
      role: 'STANDARD',
      type: 'access',
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_std',
      email: 'std@example.com',
      accountType: 'STANDARD',
      emailVerified: true,
      deletedAt: null,
    });

    const result = await verifyAccessToken('valid_token');
    expect(result.role).toBe('STANDARD');
    expect(result.id).toBe('user_std');
  });

  it('should accept valid access token with ADMIN role', async () => {
    (jwt.verify as any).mockReturnValue({
      userId: 'user_admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      type: 'access',
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_admin',
      email: 'admin@example.com',
      accountType: 'ADMIN',
      emailVerified: true,
      deletedAt: null,
    });

    const result = await verifyAccessToken('admin_token');
    expect(result.role).toBe('ADMIN');
  });

  it('should accept valid access token with SUPPORT role', async () => {
    (jwt.verify as any).mockReturnValue({
      userId: 'user_support',
      email: 'support@example.com',
      role: 'SUPPORT',
      type: 'access',
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_support',
      email: 'support@example.com',
      accountType: 'SUPPORT',
      emailVerified: true,
      deletedAt: null,
    });

    const result = await verifyAccessToken('support_token');
    expect(result.role).toBe('SUPPORT');
  });

  it('should reject refresh token type used as access token', async () => {
    (jwt.verify as any).mockReturnValue({
      userId: 'user_1',
      email: 'test@example.com',
      role: 'STANDARD',
      type: 'refresh',
    });

    await expect(verifyAccessToken('refresh_type_token')).rejects.toThrow(UnauthorizedError);
  });

  it('should reject expired token', async () => {
    const { TokenExpiredError } = await import('jsonwebtoken');
    (jwt.verify as any).mockImplementation(() => {
      throw new TokenExpiredError('jwt expired');
    });

    await expect(verifyAccessToken('expired_token')).rejects.toThrow(UnauthorizedError);
  });

  it('should reject malformed token', async () => {
    const { JsonWebTokenError } = await import('jsonwebtoken');
    (jwt.verify as any).mockImplementation(() => {
      throw new JsonWebTokenError('jwt malformed');
    });

    await expect(verifyAccessToken('malformed')).rejects.toThrow(UnauthorizedError);
  });
});
