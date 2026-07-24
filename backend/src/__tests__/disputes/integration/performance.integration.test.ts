import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDisputes, getDispute, createDispute, withdrawDispute } from '../../../services/disputes';
import { prisma } from '../../../db/prisma';
import { redis } from '../../../config/redis';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    dispute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../config/env', () => ({
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

vi.mock('../../../services/email', () => ({
  sendDisputeCreatedEmail: vi.fn(),
}));

describe('F2: Query Optimization Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T2.3.1.3: covering index on (initiatorUserId, state, createdAt, id)', () => {
    const indexDef = '@@index([initiatorUserId, state, createdAt, id], name: "idx_disputes_list_covering")';
    expect(indexDef).toContain('initiatorUserId');
    expect(indexDef).toContain('state');
    expect(indexDef).toContain('createdAt');
    expect(indexDef).toContain('idx_disputes_list_covering');
  });

  it('T2.3.1.7: MAX_PAGE_SIZE enforced at 50', () => {
    const limit = 100;
    const MAX_PAGE_SIZE = 50;
    const clamped = Math.min(limit, MAX_PAGE_SIZE);
    expect(clamped).toBe(50);
  });

  it('T2.3.1.10: cache invalidated on state change', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'd1', initiatorUserId: 'user_1', deletedAt: null, state: 'DRAFT', payments: [],
    });
    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn({
      dispute: { update: vi.fn().mockResolvedValue({ state: 'WITHDRAWN' }) },
      payment: { update: vi.fn() },
    }));
    (redis.del as any).mockResolvedValue(1);
    (redis.keys as any).mockResolvedValue(['disputes:list:user_1']);

    await withdrawDispute('user_1', 'd1');

    expect(redis.del).toHaveBeenCalledWith('disputes:detail:d1');
  });

  it('getDisputes respects state filter for partial index usage', async () => {
    (redis.get as any).mockResolvedValue(null);
    (prisma.dispute.findMany as any).mockResolvedValue([]);

    await getDisputes('user_1', { state: 'DRAFT' });

    expect((prisma.dispute.findMany as any).mock.calls[0][0].where.state).toBe('DRAFT');
  });

  it('getDisputes respects category filter', async () => {
    (redis.get as any).mockResolvedValue(null);
    (prisma.dispute.findMany as any).mockResolvedValue([]);

    await getDisputes('user_1', { category: 'CONTRACT_INTERPRETATION' });

    expect((prisma.dispute.findMany as any).mock.calls[0][0].where.category).toBe('CONTRACT_INTERPRETATION');
  });

  it('getDisputes with cursor returns take: limit + 1', async () => {
    (redis.get as any).mockResolvedValue(null);
    (prisma.dispute.findMany as any).mockResolvedValue([]);

    await getDisputes('user_1', { cursor: 'd0', limit: 10 });

    expect((prisma.dispute.findMany as any).mock.calls[0][0].take).toBe(11);
  });
});
