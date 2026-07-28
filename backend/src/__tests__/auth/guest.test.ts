import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGuest } from '../../services/auth';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import * as jwt from 'jsonwebtoken';
import { ValidationError } from '../../utils/errors';

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    JWT_SECRET: 'test-jwt-secret-that-is-at-least-64-characters-long-for-testing-purposes-only!',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    ENCRYPTION_KEY: 'test-encryption-key-that-is-exactly-64-characters-long-for-testing_',
    FROM_EMAIL: 'test@meritview.app',
  }),
}));

vi.mock('../../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('../../utils/audit', () => ({
  createAuditEvent: vi.fn(),
}));

vi.mock('../../jobs/queues', () => ({
  addEmailJob: vi.fn(),
}));

describe('registerGuest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a guest user successfully', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: 'guest_123',
      email: 'guest@example.com',
      displayName: 'Guest User',
      emailVerified: true,
      accountType: 'GUEST',
    });
    (jwt.sign as any).mockReturnValue('guest_access_token');
    (redis.setex as any).mockResolvedValue('OK');

    const result = await registerGuest({
      email: 'guest@example.com',
      displayName: 'Guest User',
    });

    expect(result.user.role).toBe('GUEST');
    expect(result.user.emailVerified).toBe(true);
    expect(result.tokens.accessToken).toBe('guest_access_token');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'guest@example.com',
        accountType: 'GUEST',
        emailVerified: true,
        displayName: 'Guest User',
      }),
    });
  });

  it('should replace existing deleted guest user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'old_guest',
      email: 'guest@example.com',
      accountType: 'GUEST',
      deletedAt: null,
    });
    (prisma.user.delete as any).mockResolvedValue({ id: 'old_guest' });
    (prisma.user.create as any).mockResolvedValue({
      id: 'new_guest',
      email: 'guest@example.com',
      displayName: 'New Guest',
      emailVerified: true,
      accountType: 'GUEST',
    });
    (jwt.sign as any).mockReturnValue('guest_access_token');
    (redis.setex as any).mockResolvedValue('OK');

    const result = await registerGuest({
      email: 'guest@example.com',
      displayName: 'New Guest',
    });

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'old_guest' } });
    expect(result.user.id).toBe('new_guest');
  });

  it('should throw error if email belongs to non-guest user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'existing',
      email: 'user@example.com',
      accountType: 'STANDARD',
      deletedAt: null,
    });

    await expect(registerGuest({
      email: 'user@example.com',
    })).rejects.toThrow(ValidationError);
  });

  it('should create guest with default values when displayName not provided', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: 'guest_456',
      email: 'anon@example.com',
      displayName: null,
      emailVerified: true,
      accountType: 'GUEST',
    });
    (jwt.sign as any).mockReturnValue('access_token');
    (redis.setex as any).mockResolvedValue('OK');

    const result = await registerGuest({ email: 'anon@example.com' });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'anon@example.com',
        displayName: undefined,
      }),
    });
    expect(result.tokens.accessToken).toBe('access_token');
  });
});
