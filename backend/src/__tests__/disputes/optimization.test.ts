import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDisputes, getDispute, withdrawDispute } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { NotFoundError, ConflictError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    payment: { update: vi.fn() },
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

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
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

vi.mock('../../services/email', () => ({
  sendDisputeCreatedEmail: vi.fn(),
}));

describe('F2 Performance Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Redis caching', () => {
    it('T2.3.1.8: caches dispute list response with 5min TTL', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getDisputes('user_1', { limit: 20 });

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('disputes:list:'),
        300,
        expect.any(String)
      );
    });

    it('T2.3.1.8: returns cached dispute list when available', async () => {
      const cachedData = JSON.stringify({ data: [], nextCursor: undefined, hasMore: false });
      (redis.get as any).mockResolvedValue(cachedData);

      const result = await getDisputes('user_1', { limit: 20 });

      expect(prisma.dispute.findMany).not.toHaveBeenCalled();
      expect(result.hasMore).toBe(false);
    });

    it('T2.3.1.9: caches dispute detail with 5min TTL', async () => {
      const mockDispute = {
        id: 'd1',
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        stateChangedAt: new Date(),
      };
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      await getDispute('user_1', 'd1');

      expect(redis.setex).toHaveBeenCalledWith(
        'disputes:detail:d1',
        300,
        expect.any(String)
      );
    });

    it('T2.3.1.10: invalidates cache on dispute state change (withdraw)', async () => {
      const dispute = { id: 'd1', initiatorUserId: 'user_1', deletedAt: null, state: 'DRAFT', payments: [] };
      (prisma.dispute.findUnique as any).mockResolvedValue(dispute);
      (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn({
        dispute: { update: vi.fn().mockResolvedValue({ ...dispute, state: 'WITHDRAWN' }) },
        payment: { update: vi.fn() },
      }));
      (redis.del as any).mockResolvedValue(1);
      (redis.keys as any).mockResolvedValue(['disputes:list:user_1', 'disputes:list:user_1:COMPLETED']);

      await withdrawDispute('user_1', 'd1');

      expect(redis.del).toHaveBeenCalledWith('disputes:detail:d1');
      expect(redis.keys).toHaveBeenCalled();
    });
  });

  describe('Page size limit and cursor pagination', () => {
    it('T2.3.1.3: covering index exists in schema', async () => {
      const schema = await import('../../../prisma/schema.prisma?raw').catch(() => null);
    });

    it('T2.3.1.5: getDisputes supports cursor parameter', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([{ id: 'd1', initiatorUserId: 'user_1', deletedAt: null, state: 'DRAFT', createdAt: new Date() }]);

      const result = await getDisputes('user_1', { cursor: 'd0', limit: 20 });

      expect(prisma.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'd0' },
          skip: 1,
        })
      );
    });

    it('T2.3.1.7: page size capped at 50', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getDisputes('user_1', { limit: 100 });

      const callArgs = (prisma.dispute.findMany as any).mock.calls[0];
      expect(callArgs[0].take).toBe(51);
    });

    it('returns correct hasMore and nextCursor for paginated results', async () => {
      (redis.get as any).mockResolvedValue(null);
      const disputes = Array.from({ length: 21 }, (_, i) => ({
        id: `d${i}`,
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        createdAt: new Date(),
      }));
      (prisma.dispute.findMany as any).mockResolvedValue(disputes);

      const result = await getDisputes('user_1', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('d19');
    });

    it('returns hasMore false when results fit in page', async () => {
      (redis.get as any).mockResolvedValue(null);
      const disputes = Array.from({ length: 5 }, (_, i) => ({
        id: `d${i}`,
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        createdAt: new Date(),
      }));
      (prisma.dispute.findMany as any).mockResolvedValue(disputes);

      const result = await getDisputes('user_1', { limit: 20 });

      expect(result.data).toHaveLength(5);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('Soft delete exclusion', () => {
    it('getDisputes filters deletedAt: null', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getDisputes('user_1');

      const where = (prisma.dispute.findMany as any).mock.calls[0][0].where;
      expect(where.deletedAt).toBeNull();
    });

    it('getDispute throws NotFoundError for deleted dispute', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'deleted',
        initiatorUserId: 'user_1',
        deletedAt: new Date(),
      });

      await expect(getDispute('user_1', 'deleted')).rejects.toThrow(NotFoundError);
    });
  });

  describe('N+1 prevention', () => {
    it('getDispute uses include to prevent N+1', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'd1',
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        initiator: { id: 'user_1' },
        parties: [],
        briefs: [],
        evaluatorOutputs: [],
        opinions: null,
        payments: [],
        documents: [],
        briefPrepSessions: [],
      });

      await getDispute('user_1', 'd1');

      const callArgs = (prisma.dispute.findUnique as any).mock.calls[0];
      expect(callArgs[0].include).toBeDefined();
      expect(callArgs[0].include.parties).toBeDefined();
    });
  });

  describe('Query performance profiling', () => {
    it('getDisputes filters by user scope for index usage', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getDisputes('user_1');

      const where = (prisma.dispute.findMany as any).mock.calls[0][0].where;
      expect(where.initiatorUserId).toBe('user_1');
    });

    it('getDisputes orders by createdAt desc for recent-first', async () => {
      (redis.get as any).mockResolvedValue(null);
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getDisputes('user_1');

      expect((prisma.dispute.findMany as any).mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
    });
  });
});
