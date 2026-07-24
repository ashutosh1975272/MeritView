import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPasswordReset, completePasswordReset } from '../../../services/auth';
import { prisma } from '../../../db/prisma';
import { redis } from '../../../config/redis';
import * as bcrypt from 'bcrypt';
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

describe('Password Reset Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1.2.2.11: full password reset flow in database', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user_reset',
      email: 'reset@example.com',
    });
    (redis.setex as any).mockResolvedValue('OK');

    await requestPasswordReset('reset@example.com');

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^reset:/),
      3600,
      'user_reset'
    );

    (redis.get as any).mockResolvedValue('user_reset');
    (bcrypt.hash as any).mockResolvedValue('new_hashed_password');
    (prisma.user.update as any).mockResolvedValue({
      id: 'user_reset',
      passwordHash: 'new_hashed_password',
    });
    (redis.del as any).mockResolvedValue(1);
    (redis.keys as any).mockResolvedValue([]);

    await completePasswordReset('valid_reset_token', 'NewStr0ng!');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_reset' },
      data: { passwordHash: 'new_hashed_password' },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('NewStr0ng!', 12);
  });

  it('should throw for invalid token', async () => {
    (redis.get as any).mockResolvedValue(null);

    await expect(completePasswordReset('bad_token', 'NewStr0ng!')).rejects.toThrow(ValidationError);
  });

  it('should not reveal if email exists for non-existent user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(requestPasswordReset('nonexistent@example.com')).resolves.not.toThrow();
  });
});
