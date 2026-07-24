import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerUser, verifyEmail, loginUser, refreshTokens, logoutUser, requestPasswordReset, completePasswordReset, getMe, updateMe, deleteAccount } from '../../services/auth';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, ConflictError } from '../../utils/errors';

// Mock dependencies
vi.mock('../../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dispute: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
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

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        accountType: 'STANDARD',
        emailVerified: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed_password');
      (prisma.user.create as any).mockResolvedValue(mockUser);
      (redis.setex as any).mockResolvedValue('OK');
      (jwt.sign as any).mockReturnValue('access_token');
      
      const result = await registerUser({
        email: 'test@example.com',
        password: 'password123',
        acceptTerms: true,
        marketingOptIn: false,
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('access_token');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should throw error for duplicate email', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user_123', deletedAt: null });

      await expect(registerUser({
        email: 'test@example.com',
        password: 'password123',
        acceptTerms: true,
      })).rejects.toThrow(ValidationError);
    });

    it('should throw error for weak password', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(registerUser({
        email: 'test@example.com',
        password: 'weak',
        acceptTerms: true,
      })).rejects.toThrow(ValidationError);
    });

    it('should throw error when terms not accepted', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(registerUser({
        email: 'test@example.com',
        password: 'password123',
        acceptTerms: false,
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      (redis.get as any).mockResolvedValue('user_123');
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user_123', emailVerified: false });
      (prisma.user.update as any).mockResolvedValue({ id: 'user_123', emailVerified: true });
      (redis.del as any).mockResolvedValue(1);

      await verifyEmail('valid_token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { emailVerified: true },
      });
    });

    it('should throw error for expired token', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(verifyEmail('expired_token')).rejects.toThrow(ValidationError);
    });
  });

  describe('loginUser', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        accountType: 'STANDARD',
        emailVerified: true,
        deletedAt: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('access_token');
      (redis.setex as any).mockResolvedValue('OK');
      (prisma.user.update as any).mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });

      const result = await loginUser('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('access_token');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(loginUser('test@example.com', 'password123')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw error for wrong password', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        emailVerified: true,
        deletedAt: null,
      });
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(loginUser('test@example.com', 'wrong_password')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw error for unverified email', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        emailVerified: false,
        deletedAt: null,
      });
      (bcrypt.compare as any).mockResolvedValue(true);

      await expect(loginUser('test@example.com', 'password123')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      (redis.get as any).mockResolvedValue(JSON.stringify({ userId: 'user_123', tokenId: 'token_123' }));
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        accountType: 'STANDARD',
        emailVerified: true,
        deletedAt: null,
      });
      (redis.del as any).mockResolvedValue(1);
      (jwt.sign as any).mockReturnValue('new_access_token');
      (redis.setex as any).mockResolvedValue('OK');

      const result = await refreshTokens('refresh_token');

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid refresh token', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(refreshTokens('invalid_token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logoutUser', () => {
    it('should logout successfully', async () => {
      (redis.del as any).mockResolvedValue(1);

      await logoutUser('refresh_token');

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset for existing user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user_123', email: 'test@example.com' });
      (redis.setex as any).mockResolvedValue('OK');

      await requestPasswordReset('test@example.com');

      expect(redis.setex).toHaveBeenCalled();
    });

    it('should not reveal if email exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (redis.setex as any).mockResolvedValue('OK');

      // Should not throw
      await expect(requestPasswordReset('nonexistent@example.com')).resolves.not.toThrow();
    });
  });

  describe('completePasswordReset', () => {
    it('should reset password with valid token', async () => {
      (redis.get as any).mockResolvedValue('user_123');
      (bcrypt.hash as any).mockResolvedValue('new_hashed_password');
      (prisma.user.update as any).mockResolvedValue({ id: 'user_123', passwordHash: 'new_hashed_password' });
      (redis.del as any).mockResolvedValue(1);
      (redis.keys as any).mockResolvedValue([]);

      await completePasswordReset('valid_token', 'newPassword123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { passwordHash: 'new_hashed_password' },
      });
    });

    it('should throw error for invalid token', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(completePasswordReset('invalid_token', 'newPassword123')).rejects.toThrow(ValidationError);
    });

    it('should throw error for weak password', async () => {
      (redis.get as any).mockResolvedValue('user_123');

      await expect(completePasswordReset('valid_token', 'weak')).rejects.toThrow(ValidationError);
    });
  });

  describe('getMe', () => {
    it('should return user profile', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        accountType: 'STANDARD',
        emailVerified: true,
        deletedAt: null,
      });

      const result = await getMe('user_123');

      expect(result.id).toBe('user_123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(getMe('user_123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateMe', () => {
    it('should update user profile', async () => {
      (prisma.user.update as any).mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        accountType: 'STANDARD',
        emailVerified: true,
      });

      const result = await updateMe('user_123', {
        displayName: 'Updated Name',
        marketingOptIn: true,
        preferredLlmProvider: 'groq',
      });

      expect(result.id).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('STANDARD');
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('should delete account with no active disputes', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        disputes: [],
      });
      (prisma.user.update as any).mockResolvedValue({ id: 'user_123', deletedAt: new Date() });
      (redis.keys as any).mockResolvedValue([]);

      await deleteAccount('user_123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          email: expect.stringContaining('deleted_'),
        }),
      });
    });

    it('should throw error when user has active disputes', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        disputes: [{ id: 'disp_1', state: 'UNDER_ANALYSIS' }],
      });

      await expect(deleteAccount('user_123')).rejects.toThrow(ValidationError);
    });
  });
});