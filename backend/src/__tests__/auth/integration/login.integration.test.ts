import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUser, registerUser } from '../../../services/auth';
import { prisma } from '../../../db/prisma';
import { redis } from '../../../config/redis';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../../../utils/errors';

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

describe('Login Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1.2.2.6: full login flow POST -> JWT -> Redis session created', async () => {
    const mockUser = {
      id: 'user_login',
      email: 'login@example.com',
      passwordHash: 'hashed_12',
      accountType: 'STANDARD',
      emailVerified: true,
      deletedAt: null,
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);
    (jwt.sign as any).mockReturnValue('access_token_login');
    (redis.setex as any).mockResolvedValue('OK');
    (prisma.user.update as any).mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });

    const result = await loginUser('login@example.com', 'Str0ngPass!');

    expect(result.tokens.accessToken).toBe('access_token_login');
    expect(result.tokens.refreshToken).toBeDefined();
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^refresh:/),
      604800,
      expect.any(String)
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_login' },
        data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      })
    );
  });

  it('T1.2.2.7: login unverified email returns 403', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_unverified',
      email: 'unverified@example.com',
      passwordHash: 'hashed',
      accountType: 'STANDARD',
      emailVerified: false,
      deletedAt: null,
    });
    (bcrypt.compare as any).mockResolvedValue(true);

    await expect(loginUser('unverified@example.com', 'Str0ngPass!')).rejects.toThrow(ForbiddenError);
  });
});
