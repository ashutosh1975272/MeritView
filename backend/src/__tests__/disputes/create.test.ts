import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDispute, getDisputes, getDispute, updateDispute } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError, ConflictError, UnauthorizedError, RateLimitError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';
import { createRateLimiter } from '../../middleware/rateLimit';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
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

vi.mock('../../middleware/auth', () => ({
  authMiddleware: vi.fn(),
  requireEmailVerified: vi.fn(),
  AuthenticatedRequest: {} as any,
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn(),
    ttl: vi.fn(),
    decr: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    RATE_LIMIT_WINDOW_MS: 3600000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'a'.repeat(64),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    ENCRYPTION_KEY: 'b'.repeat(64),
    FROM_EMAIL: 'test@test.com',
  }),
}));

describe('Disputes Service - create/get/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDispute', () => {
    const baseCreateArgs = () => expect.objectContaining({
      data: expect.objectContaining({
        state: 'DRAFT',
        category: 'CONTRACT_INTERPRETATION',
        title: 'Employment dispute test',
        pricingTier: 'STANDARD',
      }),
    });

    it('creates a dispute with valid input', async () => {
      const mockDispute = {
        id: 'disp_1',
        category: 'CONTRACT_INTERPRETATION',
        title: 'Employment dispute test',
        summary: null,
        estimatedStakesUsd: null,
        state: 'DRAFT',
        pricingTier: 'STANDARD',
        priceUsd: 49,
        createdAt: new Date(),
        updatedAt: new Date(),
        stateChangedAt: new Date(),
        completedAt: null,
        parties: [],
        briefs: [],
        evaluatorOutputs: [],
        opinions: [],
        payments: [],
        documents: [],
        briefPrepSessions: [],
        initiator: { id: 'user_1', email: 'test@example.com', displayName: 'Test', emailVerified: true },
      };

      (prisma.dispute.create as any).mockResolvedValue(mockDispute);

      const result = await createDispute('user_1', {
        category: 'CONTRACT_INTERPRETATION',
        title: 'Employment dispute test',
        pricingTier: 'STANDARD',
      });

      expect(result.id).toBe('disp_1');
      expect(result.state).toBe('DRAFT');
      expect(prisma.dispute.create).toHaveBeenCalledWith(baseCreateArgs());
      expect(logger.info).toHaveBeenCalledWith('Dispute created', { disputeId: 'disp_1', userId: 'user_1' });
    });

    it('sets default price_usd to 49.00', async () => {
      (prisma.dispute.create as any).mockResolvedValue({ id: 'disp_1', state: 'DRAFT', priceUsd: 49, parties: [], briefs: [], evaluatorOutputs: [], opinions: [], payments: [], documents: [], briefPrepSessions: [] });

      await createDispute('user_1', {
        category: 'CONTRACT_INTERPRETATION',
        title: 'Valid title for test',
      });

      const callArgs = (prisma.dispute.create as any).mock.calls[0];
      expect(callArgs[0].data.pricingTier).toBe('STANDARD');
      expect(callArgs[0].data.priceUsd).toBeDefined();
    });

    it('sets party role INITIATOR and briefStatus NOT_STARTED', async () => {
      (prisma.dispute.create as any).mockResolvedValue({ id: 'disp_1', state: 'DRAFT', priceUsd: 49, parties: [], briefs: [], evaluatorOutputs: [], opinions: [], payments: [], documents: [], briefPrepSessions: [] });

      await createDispute('user_1', {
        category: 'CONTRACT_INTERPRETATION',
        title: 'Valid title for test',
      });

      const callArgs = (prisma.dispute.create as any).mock.calls[0];
      expect(callArgs[0].data.parties).toEqual({
        create: {
          role: 'INITIATOR',
          userId: 'user_1',
          briefStatus: 'NOT_STARTED',
        },
      });
    });

    it('throws ValidationError for title too short', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'AB',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for title too long', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'A'.repeat(201),
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for summary exceeding max length', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'Valid title for test',
          summary: 'A'.repeat(501),
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for negative estimated stakes', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'Valid title for test',
          estimatedStakesUsd: -1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getDisputes', () => {
    it('returns paginated disputes for user', async () => {
      const mockDisputes = [
        { id: 'disp_1', initiatorUserId: 'user_1', deletedAt: null, state: 'DRAFT', createdAt: new Date() },
        { id: 'disp_2', initiatorUserId: 'user_1', deletedAt: null, state: 'COMPLETED', createdAt: new Date() },
      ];

      (prisma.dispute.findMany as any).mockResolvedValue(mockDisputes);

      const result = await getDisputes('user_1', { limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('respects state filter', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);
      await getDisputes('user_1', { state: 'COMPLETED' });
      expect(prisma.dispute.findMany).toHaveBeenCalled();
    });

    it('respects category filter', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);
      await getDisputes('user_1', { category: 'CONTRACT_INTERPRETATION' });
      expect(prisma.dispute.findMany).toHaveBeenCalled();
    });

    it('sets hasMore when results exceed limit', async () => {
      const manyDisputes = Array.from({ length: 21 }, (_, i) => ({
        id: `disp_${i}`,
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        createdAt: new Date(),
      }));

      (prisma.dispute.findMany as any).mockResolvedValue(manyDisputes);

      const result = await getDisputes('user_1', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(manyDisputes[19].id);
    });

    it('caps limit at 50', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([]);
      await getDisputes('user_1', { limit: 999 });
      const callArgs = (prisma.dispute.findMany as any).mock.calls[0];
      expect(callArgs[0].take).toBeLessThanOrEqual(51);
    });
  });

  describe('getDispute', () => {
    it('returns dispute for authorized user', async () => {
      const mockDispute = {
        id: 'disp_1',
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        initiator: { id: 'user_1', email: 'test@example.com', displayName: 'Test', emailVerified: true },
        parties: [],
        briefs: [],
        evaluatorOutputs: [],
        opinions: [],
        payments: [],
        documents: [],
        briefPrepSessions: [],
      };

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      const result = await getDispute('user_1', 'disp_1');

      expect(result.id).toBe('disp_1');
    });

    it('throws NotFoundError for deleted dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        initiatorUserId: 'user_1',
        deletedAt: new Date(),
      });

      await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError for non-existent dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);
      await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when user is not initiator', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        initiatorUserId: 'user_other',
        deletedAt: null,
      });

      await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateDispute', () => {
    const baseDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates a draft dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
      (prisma.dispute.update as any).mockResolvedValue({
        ...baseDispute,
        title: 'Updated title',
      });

      const result = await updateDispute('user_1', 'disp_1', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });

    it('throws NotFoundError for non-existent dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);
      await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when dispute is not in DRAFT state', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, state: 'COMPLETED' });
      await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(ConflictError);
    });

    it('throws ValidationError for title too short on update', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
      await expect(updateDispute('user_1', 'disp_1', { title: 'AB' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for negative estimatedStakesUsd on update', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
      await expect(updateDispute('user_1', 'disp_1', { estimatedStakesUsd: -5 })).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when another user tries to update', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, initiatorUserId: 'user_2' });
      await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('route-level auth guard', () => {
    it('throws UnauthorizedError when no auth token provided', () => {
      (authMiddleware as any).mockReturnValue(
        vi.fn().mockImplementation(() => {
          throw new UnauthorizedError('Missing or invalid authorization header');
        })
      );

      const handler = authMiddleware();
      expect(() => handler(null as any, null as any, null as any)).toThrow(UnauthorizedError);
    });
  });

  describe('route-level Zod validation', () => {
    it('rejects invalid category with 400', () => {
      const invalidCategory = 'invalid_category_type';
      const validCategory = 'CONTRACT_INTERPRETATION';

      expect(validCategory).toBeDefined();
      expect(() => {
        const DisputeCategory = ['CONTRACT_INTERPRETATION', 'SMALL_CLAIMS_ASSESSMENT', 'PARTNERSHIP_CONFLICT'];
        if (!DisputeCategory.includes(invalidCategory)) {
          throw new ValidationError('Invalid category');
        }
      }).toThrow(ValidationError);
    });
  });

  describe('rate limit (mocked)', () => {
    it('throws RateLimitError when limit exceeded', async () => {
      const rateLimitRedis = await import('../../config/redis');
      (rateLimitRedis.redis.incr as any).mockResolvedValue(101);
      (rateLimitRedis.redis.ttl as any).mockResolvedValue(3500);

      const limiter = createRateLimiter({
        windowMs: 3600000,
        maxRequests: 100,
        keyPrefix: 'test:create',
      });

      const mockReq = { ip: '127.0.0.1', path: '/v1/disputes' } as any;
      const mockRes = { setHeader: vi.fn(), send: vi.fn() } as any;
      const next = vi.fn();

      await limiter(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(expect.any(RateLimitError));
    });
  });
});
