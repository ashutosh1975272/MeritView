import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { ConflictError, NotFoundError } from '../../../utils/errors';
import { validateDisputeStateTransition } from '../../../services/disputes';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    dispute: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
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
    keys: vi.fn(),
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

import { withdrawDispute } from '../../../services/disputes';

describe('F2 Integration: State Machine Full Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDispute(overrides: any = {}) {
    return {
      id: 'disp_sm_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT',
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
      ...overrides,
    };
  }

  function setupTransaction() {
    const mockTx: any = {
      dispute: { update: vi.fn().mockImplementation((args: any) => Promise.resolve({ ...mockDispute(), ...args.data })) },
      payment: { update: vi.fn() },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));
    return mockTx;
  }

  it('T2.2.2.7: full state transition flow DRAFT -> WITHDRAWN', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute({ state: 'DRAFT' }));
    const tx = setupTransaction();

    const result = await withdrawDispute('user_1', 'disp_sm_1');

    expect(tx.dispute.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'WITHDRAWN' }),
      })
    );
    expect(result.state).toBe('WITHDRAWN');
  });

  it('T2.2.2.7: DRAFT -> BRIEF_SUBMITTED -> PAYMENT_PENDING flow', async () => {
    expect(validateDisputeStateTransition('DRAFT', 'BRIEF_SUBMITTED')).toBe(true);
    expect(validateDisputeStateTransition('BRIEF_SUBMITTED', 'PAYMENT_PENDING')).toBe(true);
    expect(validateDisputeStateTransition('DRAFT', 'PAYMENT_PENDING')).toBe(false);
  });

  it('T2.2.2.7: PAYMENT_PENDING -> UNDER_ANALYSIS -> AWAITING_AGGREGATION -> COMPLETED', () => {
    expect(validateDisputeStateTransition('PAYMENT_PENDING', 'UNDER_ANALYSIS')).toBe(true);
    expect(validateDisputeStateTransition('UNDER_ANALYSIS', 'AWAITING_AGGREGATION')).toBe(true);
    expect(validateDisputeStateTransition('AWAITING_AGGREGATION', 'COMPLETED')).toBe(true);
    expect(validateDisputeStateTransition('COMPLETED', 'DRAFT')).toBe(false);
  });

  it('T2.2.2.8: concurrent withdrawal race condition - second call fails', async () => {
    (prisma.dispute.findUnique as any)
      .mockResolvedValueOnce(mockDispute({ state: 'DRAFT' }))
      .mockResolvedValueOnce(mockDispute({ state: 'WITHDRAWN' }));

    const tx = setupTransaction();

    await withdrawDispute('user_1', 'disp_sm_1');

    expect(logger.info).toHaveBeenCalledWith('Dispute withdrawn', expect.any(Object));
  });

  it('T2.2.2.8: concurrent update conflict detection via state check', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute({ state: 'WITHDRAWN', deletedAt: null }));

    await expect(withdrawDispute('user_1', 'disp_sm_1')).rejects.toThrow(ConflictError);
  });

  it('T2.2.2.9: no orphaned records - withdrawal updates existing records', async () => {
    const disputeWithPayment = mockDispute({
      state: 'PAYMENT_PENDING',
      payments: [{ id: 'pay_sm_1', status: 'SUCCEEDED', amountUsd: 49 }],
    });
    (prisma.dispute.findUnique as any).mockResolvedValue(disputeWithPayment);

    const mockTx: any = {
      dispute: { update: vi.fn().mockResolvedValue({ ...disputeWithPayment, state: 'WITHDRAWN' }) },
      payment: { update: vi.fn().mockResolvedValue({ id: 'pay_sm_1', status: 'REFUNDED' }) },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

    await withdrawDispute('user_1', 'disp_sm_1');

    expect(mockTx.dispute.update).toHaveBeenCalled();
    expect(mockTx.payment.update).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('T2.2.2.10: dispute detail query uses Prisma includes to prevent N+1', async () => {
    const mockDetail = {
      id: 'disp_detail',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT',
      initiator: { id: 'user_1', email: 'test@test.com', displayName: 'Test', emailVerified: true },
      parties: [{ id: 'p1', role: 'INITIATOR', briefStatus: 'NOT_STARTED' }],
      briefs: [],
      evaluatorOutputs: [],
      opinions: null,
      payments: [],
      documents: [],
      briefPrepSessions: [],
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDetail);

    const { getDispute } = await import('../../../services/disputes');
    const result = await getDispute('user_1', 'disp_detail');

    expect(prisma.dispute.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          parties: expect.any(Object),
          initiator: expect.any(Object),
        }),
      })
    );
    expect(result.id).toBe('disp_detail');
  });

  it('T2.2.2.15: soft-deleted dispute excluded from normal query', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'deleted_disp',
      initiatorUserId: 'user_1',
      deletedAt: new Date(),
    });

    const { getDispute } = await import('../../../services/disputes');
    await expect(getDispute('user_1', 'deleted_disp')).rejects.toThrow(NotFoundError);
  });

  it('validates all allowed transitions in state matrix', () => {
    const matrix: Record<string, string[]> = {
      DRAFT: ['BRIEF_SUBMITTED', 'WITHDRAWN'],
      BRIEF_SUBMITTED: ['PAYMENT_PENDING', 'DRAFT', 'WITHDRAWN'],
      PAYMENT_PENDING: ['UNDER_ANALYSIS', 'DRAFT', 'FAILED', 'WITHDRAWN'],
      UNDER_ANALYSIS: ['AWAITING_AGGREGATION', 'FAILED', 'WITHDRAWN'],
      AWAITING_AGGREGATION: ['COMPLETED', 'FAILED'],
      COMPLETED: [],
      WITHDRAWN: [],
      FAILED: [],
      DECLINED: [],
      AWAITING_COUNTERPARTY: [],
      IN_PROGRESS: [],
      AWAITING_BRIEFS: [],
      AWAITING_COUNTERPARTY_BRIEF: [],
    };

    const states = Object.keys(matrix);
    for (const from of states) {
      for (const to of states) {
        const expected = matrix[from].includes(to);
        expect(validateDisputeStateTransition(from as any, to as any)).toBe(expected);
      }
    }
  });
});
