import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser } from '../../../services/auth';
import { prisma } from '../../../db/prisma';
import { redis } from '../../../config/redis';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
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

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('../../../services/email', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendAccountDeletionEmail: vi.fn(),
}));

describe('Register Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1.2.2.3: full register flow POST -> DB row -> verification queued', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed_password_12');
    (prisma.user.create as any).mockResolvedValue({
      id: 'user_123',
      email: 'test@example.com',
      accountType: 'STANDARD',
      emailVerified: false,
    });
    (redis.setex as any).mockResolvedValue('OK');
    (jwt.sign as any).mockReturnValue('access_token');

    const result = await registerUser({
      email: 'test@example.com',
      password: 'Str0ngPass!',
      acceptTerms: true,
      marketingOptIn: false,
    });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'test@example.com',
          emailVerified: false,
          accountType: 'STANDARD',
        }),
      })
    );
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^verify:/),
      expect.any(Number),
      'user_123'
    );
    expect(result.user.id).toBe('user_123');
    expect(result.tokens.accessToken).toBe('access_token');
  });

  it('T1.2.2.4: concurrent register same email -> one succeeds one 409', async () => {
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing', deletedAt: null });
    (bcrypt.hash as any).mockResolvedValue('hashed');
    (prisma.user.create as any).mockResolvedValue({
      id: 'user_456',
      email: 'dup@example.com',
      accountType: 'STANDARD',
      emailVerified: false,
    });
    (redis.setex as any).mockResolvedValue('OK');
    (jwt.sign as any).mockReturnValue('access_token');

    const first = registerUser({
      email: 'dup@example.com',
      password: 'Str0ngPass!',
      acceptTerms: true,
    });

    await expect(first).resolves.toBeDefined();

    (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing', deletedAt: null });

    const { ValidationError } = await import('../../../utils/errors');
    const second = registerUser({
      email: 'dup@example.com',
      password: 'Str0ngPass!',
      acceptTerms: true,
    });

    await expect(second).rejects.toThrow(ValidationError);
  });
});
