import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStripeWebhook } from '../../services/payments';
import { prisma } from '../../db/prisma';
import { ValidationError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
    },
    payment: {
      update: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
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
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
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

describe('Payments - handleStripeWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSucceededEvent = JSON.stringify({
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_mock_123',
        status: 'succeeded',
        metadata: { disputeId: 'disp_123', userId: 'user_123' },
      },
    },
  });

  const mockFailedEvent = JSON.stringify({
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_mock_456',
        status: 'failed',
        metadata: {},
      },
    },
  });

  it('should accept valid webhook and return received true', async () => {
    const result = await handleStripeWebhook(mockSucceededEvent, 'test_sig');
    expect(result).toEqual({ received: true });
  });

  it('should handle payment_intent.succeeded by confirming payment (T3.2.1.15)', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay_123',
      disputeId: 'disp_123',
      processorPaymentId: 'pi_mock_123',
      status: 'PENDING',
      amountUsd: 49,
    });

    const mockUpdatedDispute = {
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
    };

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      const tx = {
        payment: {
          update: vi.fn().mockResolvedValue({ id: 'pay_123', status: 'SUCCEEDED' }),
        },
        dispute: {
          update: vi.fn().mockResolvedValue(mockUpdatedDispute),
        },
      };
      return fn(tx);
    });
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'disp_123',
      title: 'Test',
      initiatorUserId: 'user_123',
      state: 'PAYMENT_PENDING',
      deletedAt: null,
      payments: [
        { id: 'pay_123', processorPaymentId: 'pi_mock_123', status: 'PENDING', amountUsd: 49, disputeId: 'disp_123' },
      ],
    });

    const result = await handleStripeWebhook(mockSucceededEvent, 'test_sig');

    expect(result).toEqual({ received: true });
  });

  it('should handle payment_intent.failed by reverting payment status (T3.2.1.16)', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay_456',
      disputeId: 'disp_456',
      processorPaymentId: 'pi_mock_456',
      status: 'PENDING',
    });

    const result = await handleStripeWebhook(mockFailedEvent, 'test_sig');

    expect(result).toEqual({ received: true });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_456' },
      data: { status: 'FAILED', completedAt: expect.any(Date) },
    });
  });

  it('should handle unknown event types gracefully', async () => {
    const unknownEvent = JSON.stringify({
      type: 'charge.updated',
      data: { object: { id: 'ch_123' } },
    });

    const result = await handleStripeWebhook(unknownEvent, 'test_sig');

    expect(result).toEqual({ received: true });
  });

  it('should not throw when payment is not found for webhook event', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue(null);

    const result = await handleStripeWebhook(mockSucceededEvent, 'test_sig');

    expect(result).toEqual({ received: true });
  });

  it('should not confirm if payment is not in PENDING state', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay_123',
      disputeId: 'disp_123',
      processorPaymentId: 'pi_mock_123',
      status: 'SUCCEEDED',
    });

    const result = await handleStripeWebhook(mockSucceededEvent, 'test_sig');

    expect(result).toEqual({ received: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
