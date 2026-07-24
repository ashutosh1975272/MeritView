import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmPayment } from '../../services/payments';
import { prisma } from '../../db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

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

describe('Payments - confirmPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDispute = {
    id: 'disp_123',
    title: 'Test Dispute',
    initiatorUserId: 'user_123',
    state: 'PAYMENT_PENDING',
    deletedAt: null,
    payments: [
      {
        id: 'pay_123',
        processorPaymentId: 'pi_mock_123',
        status: 'PENDING',
        amountUsd: 49,
        disputeId: 'disp_123',
      },
    ],
  };

  it('should confirm valid payment and return dispute with under_analysis state (T3.2.1.7)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (prisma.payment.update as any).mockResolvedValue({
      id: 'pay_123',
      status: 'SUCCEEDED',
      processorChargeId: 'ch_mock_123',
      completedAt: new Date(),
    });
    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      const tx = {
        payment: { update: vi.fn().mockResolvedValue({ id: 'pay_123', status: 'SUCCEEDED' }) },
        dispute: {
          update: vi.fn().mockResolvedValue({
            id: 'disp_123',
            state: 'UNDER_ANALYSIS',
            stateChangedAt: new Date(),
            initiator: { id: 'user_123', email: 'test@test.com', displayName: 'Test', emailVerified: true },
            parties: [],
            briefs: [],
            evaluatorOutputs: [],
            opinions: null,
            payments: [],
            documents: [],
            briefPrepSessions: [],
          }),
        },
      };
      return fn(tx);
    });

    const result = await confirmPayment('disp_123', 'user_123', 'pi_mock_123');

    expect(result).toBeDefined();
    expect(result.state).toBe('UNDER_ANALYSIS');
  });

  it('should throw ConflictError for invalid payment intent state (T3.2.1.8)', async () => {
    const disputeWithSettled = {
      ...mockDispute,
      payments: [{ id: 'pay_123', processorPaymentId: 'pi_mock_123', status: 'SUCCEEDED' }],
    };
    (prisma.dispute.findUnique as any).mockResolvedValue(disputeWithSettled);

    await expect(confirmPayment('disp_123', 'user_123', 'pi_mock_123')).rejects.toThrow(ConflictError);
  });

  it('should throw NotFoundError when payment not found', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

    await expect(confirmPayment('disp_123', 'user_123', 'pi_nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for non-existent dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);

    await expect(confirmPayment('disp_404', 'user_123', 'pi_mock_123')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when user is not the initiator', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...mockDispute, initiatorUserId: 'user_other' });

    await expect(confirmPayment('disp_123', 'user_123', 'pi_mock_123')).rejects.toThrow(NotFoundError);
  });
});
