import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withdrawDispute } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { NotFoundError, ConflictError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
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
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
}));

describe('Disputes Service - withdrawDispute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const successfulWithdrawal = (overrides = {}) =>
    (prisma.$transaction as any).mockImplementation(async (fn: Function) =>
      fn({
        dispute: {
          update: vi.fn().mockResolvedValue({ state: 'WITHDRAWN', ...overrides }),
        },
        payment: {
          update: vi.fn(),
        },
      })
    );

  it('withdraws a dispute in DRAFT state and returns updated dispute', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT',
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    successfulWithdrawal();

    const result = await withdrawDispute('user_1', 'disp_1');

    expect(result.state).toBe('WITHDRAWN');
    expect(logger.info).toHaveBeenCalledWith('Dispute withdrawn', { disputeId: 'disp_1', userId: 'user_1' });
  });

  it('refunds a succeeded payment when withdrawing', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'PAYMENT_PENDING',
      payments: [{ id: 'pay_1', status: 'SUCCEEDED', amountUsd: 49 }],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

    const mockTx: any = {
      dispute: { update: vi.fn().mockResolvedValue({ ...mockDispute, state: 'WITHDRAWN' }) },
      payment: { update: vi.fn().mockResolvedValue({ ...mockDispute.payments[0], status: 'REFUNDED' }) },
    };

    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

    const result = await withdrawDispute('user_1', 'disp_1');

    expect(mockTx.dispute.update).toHaveBeenCalled();
    expect(mockTx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({ status: 'REFUNDED', refundReason: 'Dispute withdrawn' }),
    });
    expect(result.state).toBe('WITHDRAWN');
  });

  it('throws NotFoundError for deleted dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: new Date(),
      state: 'DRAFT',
    });

    await expect(withdrawDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for non-existent dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);
    await expect(withdrawDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when user is not initiator', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'disp_1',
      initiatorUserId: 'user_2',
      deletedAt: null,
      state: 'DRAFT',
    });

    await expect(withdrawDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when dispute state cannot transition to WITHDRAWN', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'COMPLETED',
    });

    await expect(withdrawDispute('user_1', 'disp_1')).rejects.toThrow(ConflictError);
  });

  it('withdraws a dispute in BRIEF_SUBMITTED state', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'BRIEF_SUBMITTED',
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    successfulWithdrawal();

    const result = await withdrawDispute('user_1', 'disp_1');

    expect(result.state).toBe('WITHDRAWN');
  });

  it('withdraws a dispute in UNDER_ANALYSIS state', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'UNDER_ANALYSIS',
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    successfulWithdrawal();

    const result = await withdrawDispute('user_1', 'disp_1');

    expect(result.state).toBe('WITHDRAWN');
  });

  it('refund amount matches the original payment amount', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'PAYMENT_PENDING',
      payments: [{ id: 'pay_1', status: 'SUCCEEDED', amountUsd: 99 }],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

    const mockTx: any = {
      dispute: { update: vi.fn().mockResolvedValue({ ...mockDispute, state: 'WITHDRAWN' }) },
      payment: { update: vi.fn().mockResolvedValue({ ...mockDispute.payments[0], status: 'REFUNDED' }) },
    };

    (prisma.$transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

    await withdrawDispute('user_1', 'disp_1');

    expect(mockTx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        status: 'REFUNDED',
        refundedAmountUsd: 99,
      }),
    });
  });

  it('does not create refund when no successful payments exist', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT',
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
    };

    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    successfulWithdrawal();

    await withdrawDispute('user_1', 'disp_1');

    expect(logger.info).toHaveBeenCalled();
  });
});
