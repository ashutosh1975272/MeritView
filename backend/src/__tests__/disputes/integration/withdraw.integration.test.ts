import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withdrawDispute } from '../../../services/disputes';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { NotFoundError, ConflictError } from '../../../utils/errors';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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

function mockDispute(overrides: any = {}) {
  return {
    id: 'disp_wd_1',
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
    dispute: { update: vi.fn().mockResolvedValue({ id: 'disp_wd_1', state: 'WITHDRAWN' }) },
    payment: { update: vi.fn() },
  };
  (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));
  return mockTx;
}

describe('F2 Integration: Withdraw Dispute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T2.2.2.17: withdrawal with payment creates refund record', async () => {
    const disputeWithPayment = mockDispute({
      state: 'PAYMENT_PENDING',
      payments: [{ id: 'pay_wd_1', status: 'SUCCEEDED', amountUsd: 49 }],
    });
    (prisma.dispute.findUnique as any).mockResolvedValue(disputeWithPayment);

    const mockTx: any = {
      dispute: { update: vi.fn().mockResolvedValue({ ...disputeWithPayment, state: 'WITHDRAWN' }) },
      payment: { update: vi.fn().mockResolvedValue({ id: 'pay_wd_1', status: 'REFUNDED', refundedAmountUsd: 49 }) },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

    const result = await withdrawDispute('user_1', 'disp_wd_1');

    expect(mockTx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_wd_1' },
      data: expect.objectContaining({
        status: 'REFUNDED',
        refundReason: 'Dispute withdrawn',
      }),
    });
    expect(result.state).toBe('WITHDRAWN');
  });

  it('T2.2.2.18: withdrawal without payment creates no refund record', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute({ state: 'DRAFT', payments: [] }));
    const tx = setupTransaction();

    await withdrawDispute('user_1', 'disp_wd_1');

    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('T2.2.2.19: refund amount matches original payment', async () => {
    const disputeWithPayment = mockDispute({
      state: 'UNDER_ANALYSIS',
      payments: [{ id: 'pay_wd_2', status: 'SUCCEEDED', amountUsd: 99 }],
    });
    (prisma.dispute.findUnique as any).mockResolvedValue(disputeWithPayment);

    const mockTx: any = {
      dispute: { update: vi.fn().mockResolvedValue({ ...disputeWithPayment, state: 'WITHDRAWN' }) },
      payment: { update: vi.fn() },
    };
    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

    await withdrawDispute('user_1', 'disp_wd_1');

    expect(mockTx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refundedAmountUsd: 99 }),
      })
    );
  });

  it('T2.2.2.20: transaction rollback on withdrawal failure - update throws', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute({ state: 'DRAFT', payments: [] }));

    (prisma.$transaction as any).mockImplementation(async () => {
      throw new Error('Database error during transaction');
    });

    await expect(withdrawDispute('user_1', 'disp_wd_1')).rejects.toThrow('Database error during transaction');
  });

  it('T2.2.2.20: transaction rollback when payment update fails', async () => {
    const disputeWithPayment = mockDispute({
      state: 'PAYMENT_PENDING',
      payments: [{ id: 'pay_fail', status: 'SUCCEEDED', amountUsd: 49 }],
    });
    (prisma.dispute.findUnique as any).mockResolvedValue(disputeWithPayment);

    (prisma.$transaction as any).mockImplementation(async () => {
      throw new Error('Payment processing failed');
    });

    await expect(withdrawDispute('user_1', 'disp_wd_1')).rejects.toThrow('Payment processing failed');
  });

  it('throws NotFoundError for non-existent dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);
    await expect(withdrawDispute('user_1', 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError if user is not initiator', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute({ initiatorUserId: 'user_other' }));
    await expect(withdrawDispute('user_1', 'disp_wd_1')).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError for invalid state transition to WITHDRAWN', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute({ state: 'COMPLETED' }));
    await expect(withdrawDispute('user_1', 'disp_wd_1')).rejects.toThrow(ConflictError);
  });
});
