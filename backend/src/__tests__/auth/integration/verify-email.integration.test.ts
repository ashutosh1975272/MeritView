import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyEmail, registerUser, loginUser } from '../../../services/auth';
import { prisma } from '../../../db/prisma';
import { redis } from '../../../config/redis';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ValidationError } from '../../../utils/errors';

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

describe('Verify Email Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1.2.2.9: full verification flow register -> verify -> login succeeds', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed');
    (prisma.user.create as any).mockResolvedValue({
      id: 'user_vfy',
      email: 'verify@example.com',
      accountType: 'STANDARD',
      emailVerified: false,
    });
    (redis.setex as any).mockResolvedValue('OK');
    (jwt.sign as any).mockReturnValue('access_token');

    const regResult = await registerUser({
      email: 'verify@example.com',
      password: 'Str0ngPass!',
      acceptTerms: true,
    });
    expect(regResult.user.emailVerified).toBe(false);

    (redis.get as any).mockResolvedValue('user_vfy');
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_vfy',
      email: 'verify@example.com',
      emailVerified: false,
    });
    (prisma.user.update as any).mockResolvedValue({
      id: 'user_vfy',
      email: 'verify@example.com',
      emailVerified: true,
    });
    (redis.del as any).mockResolvedValue(1);

    await verifyEmail('valid_verification_token');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_vfy' },
      data: { emailVerified: true },
    });

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_vfy',
      email: 'verify@example.com',
      passwordHash: 'hashed',
      accountType: 'STANDARD',
      emailVerified: true,
      deletedAt: null,
    });
    (bcrypt.compare as any).mockResolvedValue(true);
    (jwt.sign as any).mockReturnValue('access_token_after_verify');
    (redis.setex as any).mockResolvedValue('OK');

    const loginResult = await loginUser('verify@example.com', 'Str0ngPass!');
    expect(loginResult.tokens.accessToken).toBe('access_token_after_verify');
  });

  it('should throw for expired token', async () => {
    (redis.get as any).mockResolvedValue(null);

    await expect(verifyEmail('expired_token')).rejects.toThrow(ValidationError);
  });
});
