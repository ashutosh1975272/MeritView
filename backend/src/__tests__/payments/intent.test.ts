import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent } from '../../services/payments';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { ConflictError, NotFoundError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
    },
    payment: {
      create: vi.fn(),
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

describe('Payments - createPaymentIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDispute = {
    id: 'disp_123',
    title: 'Test Dispute',
    initiatorUserId: 'user_123',
    state: 'PAYMENT_PENDING',
    deletedAt: null,
    payments: [],
    parties: [],
  };

  it('should create a payment intent for a dispute in payment_pending state (T3.2.1.2)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue(null);
    (prisma.payment.create as any).mockResolvedValue({
      id: 'pay_123',
      processorPaymentId: 'pi_mock_123',
      status: 'PENDING',
    });

    const result = await createPaymentIntent('disp_123', 'user_123');

    expect(result).toHaveProperty('clientSecret');
    expect(prisma.dispute.findUnique).toHaveBeenCalledWith({
      where: { id: 'disp_123' },
      include: { payments: true, parties: true },
    });
  });

  it('should return 200 with clientSecret for payment_pending dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue(null);
    (prisma.payment.create as any).mockResolvedValue({
      id: 'pay_123',
      processorPaymentId: 'pi_mock_123',
      status: 'PENDING',
    });

    const result = await createPaymentIntent('disp_123', 'user_123');

    expect(result.clientSecret).toBeDefined();
    expect(typeof result.clientSecret).toBe('string');
  });

  it('should reject create intent for non-payment_pending dispute with 400 (T3.2.1.3)', async () => {
    const draftDispute = { ...mockDispute, state: 'DRAFT' };
    (prisma.dispute.findUnique as any).mockResolvedValue(draftDispute);

    await expect(createPaymentIntent('disp_123', 'user_123')).rejects.toThrow(ConflictError);
  });

  it('should return original response for duplicate idempotency key (T3.2.1.4)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue('pi_mock_existing');
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay_existing',
      processorPaymentId: 'pi_existing_secret',
      status: 'PENDING',
    });

    const result = await createPaymentIntent('disp_123', 'user_123');

    expect(result.clientSecret).toBe('pi_existing_secret');
  });

  it('should create intent with amount always 49.00 USD (T3.2.1.5)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue(null);
    (prisma.payment.create as any).mockResolvedValue({
      id: 'pay_123',
      processorPaymentId: 'pi_mock_123',
      status: 'PENDING',
    });

    await createPaymentIntent('disp_123', 'user_123');

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountUsd: 49,
          currency: 'USD',
        }),
      })
    );
  });

  it('should throw NotFoundError for non-existent dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);

    await expect(createPaymentIntent('disp_404', 'user_123')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when user is not the initiator', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...mockDispute, initiatorUserId: 'user_other' });

    await expect(createPaymentIntent('disp_123', 'user_123')).rejects.toThrow(NotFoundError);
  });
});
