import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent } from '../../services/payments';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { ConflictError } from '../../utils/errors';

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

describe('Payments - Idempotency', () => {
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

  it('should store idempotency key with 24h TTL (T3.2.1.21)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue(null);
    (prisma.payment.create as any).mockResolvedValue({
      id: 'pay_123',
      processorPaymentId: 'pi_mock_123',
      status: 'PENDING',
    });

    await createPaymentIntent('disp_123', 'user_123');

    expect(redis.set).toHaveBeenCalledWith(
      'payment_intent:disp_123:user_123',
      expect.any(String),
      'EX',
      86400
    );
  });

  it('should return original response for repeated request with same idempotency key (T3.2.1.22)', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue('pi_mock_existing');
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay_existing',
      processorPaymentId: 'pi_existing_secret',
      status: 'PENDING',
    });

    const result = await createPaymentIntent('disp_123', 'user_123');

    expect(result.clientSecret).toBe('pi_existing_secret');
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('should not call Stripe when idempotency key exists in Redis', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue('pi_mock_existing');
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay_existing',
      processorPaymentId: 'pi_existing_secret',
      status: 'PENDING',
    });

    await createPaymentIntent('disp_123', 'user_123');

    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('should proceed with new payment when idempotency key is not in Redis', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
    (redis.get as any).mockResolvedValue(null);
    (prisma.payment.create as any).mockResolvedValue({
      id: 'pay_new',
      processorPaymentId: 'pi_mock_new',
      status: 'PENDING',
    });

    const result = await createPaymentIntent('disp_123', 'user_123');

    expect(result.clientSecret).toBeDefined();
    expect(prisma.payment.create).toHaveBeenCalled();
  });

  it('should generate correct idempotency key format', async () => {
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
          idempotencyKey: 'payment_intent:disp_123:user_123',
        }),
      })
    );
  });
});
