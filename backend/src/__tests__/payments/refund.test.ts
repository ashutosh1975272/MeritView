import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestRefund } from '../../services/payments';
import { prisma } from '../../db/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
    },
    payment: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(prisma)),
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
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

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    DATABASE_URL: 'postgresql://localhost/test',
    REDIS_URL: 'redis://localhost',
    ENCRYPTION_KEY: 'a'.repeat(64),
    FROM_EMAIL: 'test@test.com',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    PORT: 3001,
  }),
  env: {},
}));

describe('Payments - requestRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const succeededPayment = {
    id: 'pay_123',
    processorPaymentId: 'pi_mock_123',
    status: 'SUCCEEDED',
    amountUsd: 49,
    disputeId: 'disp_123',
  };

  const mockDispute = {
    id: 'disp_123',
    title: 'Test Dispute',
    initiatorUserId: 'user_123',
    state: 'UNDER_ANALYSIS',
    deletedAt: null,
    payments: [succeededPayment],
  };

  it('should process refund request for eligible dispute and return 202 (T3.2.1.11)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (prisma.payment.update as any).mockResolvedValue({
      ...succeededPayment,
      status: 'REFUNDED',
      refundedAmountUsd: 49,
      refundReason: 'Customer requested refund',
      refundedAt: new Date(),
    });

    const result = await requestRefund('disp_123', 'user_123');

    expect(result).toHaveProperty('message');
    expect(prisma.payment.update).toHaveBeenCalled();
  });

  it('should reject refund request for ineligible dispute with no succeeded payment (T3.2.1.12)', async () => {
    const noPaymentDispute = { ...mockDispute, payments: [] };
    (prisma.dispute.findUnique as any).mockResolvedValue(noPaymentDispute);

    await expect(requestRefund('disp_123', 'user_123')).rejects.toThrow(ValidationError);
  });

  it('should reject refund when payment status is not SUCCEEDED', async () => {
    const pendingPaymentDispute = {
      ...mockDispute,
      payments: [{ ...succeededPayment, status: 'PENDING' }],
    };
    (prisma.dispute.findUnique as any).mockResolvedValue(pendingPaymentDispute);

    await expect(requestRefund('disp_123', 'user_123')).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError for non-existent dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);

    await expect(requestRefund('disp_404', 'user_123')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when user is not the initiator', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...mockDispute, initiatorUserId: 'user_other' });

    await expect(requestRefund('disp_123', 'user_123')).rejects.toThrow(NotFoundError);
  });

  it('should update payment refund fields correctly', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (prisma.payment.update as any).mockResolvedValue({
      ...succeededPayment,
      status: 'REFUNDED',
      refundedAmountUsd: 49,
      refundReason: 'Customer requested refund',
      refundedAt: new Date(),
    });

    await requestRefund('disp_123', 'user_123');

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_123' },
      data: expect.objectContaining({
        status: 'REFUNDED',
        refundedAmountUsd: 49,
        refundReason: expect.any(String),
        refundedAt: expect.any(Date),
      }),
    });
  });
});
