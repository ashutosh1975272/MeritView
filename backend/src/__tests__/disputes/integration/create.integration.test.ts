import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDispute } from '../../../services/disputes';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { ValidationError } from '../../../utils/errors';

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

vi.mock('../../../services/email', () => ({
  sendDisputeCreatedEmail: vi.fn(),
}));

describe('F2 Integration: Create Dispute Full Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T2.2.2.2: creates dispute -> verify DB call with correct shape', async () => {
    const mockDispute = {
      id: 'disp_int_1',
      category: 'CONTRACT_INTERPRETATION',
      title: 'Integration test dispute',
      summary: 'Test summary',
      estimatedStakesUsd: null,
      state: 'DRAFT',
      pricingTier: 'STANDARD',
      priceUsd: 49,
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
      completedAt: null,
      initiator: { id: 'user_1', email: 'test@example.com', displayName: 'Test', emailVerified: true },
      parties: [],
      briefs: [],
      evaluatorOutputs: [],
      opinions: [],
      payments: [],
      documents: [],
      briefPrepSessions: [],
    };

    (prisma.dispute.create as any).mockResolvedValue(mockDispute);

    const result = await createDispute('user_1', {
      category: 'CONTRACT_INTERPRETATION',
      title: 'Integration test dispute',
      summary: 'Test summary',
    });

    expect(prisma.dispute.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('disp_int_1');
    expect(result.state).toBe('DRAFT');
    expect(logger.info).toHaveBeenCalledWith('Dispute created', { disputeId: 'disp_int_1', userId: 'user_1' });
  });

  it('T2.2.2.3: create with mock Prisma database accepts all fields', async () => {
    (prisma.dispute.create as any).mockResolvedValue({ id: 'd1', state: 'DRAFT', priceUsd: 49, parties: [], briefs: [], evaluatorOutputs: [], opinions: [], payments: [], documents: [], briefPrepSessions: [] });

    await createDispute('user_1', {
      category: 'SMALL_CLAIMS_ASSESSMENT',
      title: 'Small claims dispute for refund',
      summary: 'Customer seeks refund for defective product',
      estimatedStakesUsd: 500,
      pricingTier: 'EXPEDITED',
    });

    const callArgs = (prisma.dispute.create as any).mock.calls[0][0].data;
    expect(callArgs.category).toBe('SMALL_CLAIMS_ASSESSMENT');
    expect(callArgs.title).toBe('Small claims dispute for refund');
    expect(callArgs.summary).toBe('Customer seeks refund for defective product');
    expect(callArgs.estimatedStakesUsd).toBeDefined();
    expect(callArgs.pricingTier).toBe('EXPEDITED');
    expect(callArgs.priceUsd).toBeDefined();
    expect(callArgs.initiatorUserId).toBe('user_1');
  });

  it('T2.2.2.4: verify dispute record fields match input', async () => {
    const mockDispute = {
      id: 'disp_verify',
      category: 'PARTNERSHIP_CONFLICT',
      title: 'Partnership dissolution dispute',
      summary: 'Disagreement on profit sharing ratio',
      estimatedStakesUsd: 50000,
      state: 'DRAFT',
      pricingTier: 'EXTENDED',
      priceUsd: 199,
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
      completedAt: null,
      initiator: { id: 'user_2', email: 'partner@test.com', displayName: 'Partner', emailVerified: true },
      parties: [],
      briefs: [],
      evaluatorOutputs: [],
      opinions: [],
      payments: [],
      documents: [],
      briefPrepSessions: [],
    };

    (prisma.dispute.create as any).mockResolvedValue(mockDispute);

    const result = await createDispute('user_2', {
      category: 'PARTNERSHIP_CONFLICT',
      title: 'Partnership dissolution dispute',
      summary: 'Disagreement on profit sharing ratio',
      estimatedStakesUsd: 50000,
      pricingTier: 'EXTENDED',
    });

    expect(result.category).toBe('PARTNERSHIP_CONFLICT');
    expect(result.title).toBe('Partnership dissolution dispute');
    expect(result.summary).toBe('Disagreement on profit sharing ratio');
    expect(result.estimatedStakesUsd).toBe(50000);
    expect(result.pricingTier).toBe('EXTENDED');
    expect(result.priceUsd).toBe(199);
    expect(result.state).toBe('DRAFT');
  });

  it('T2.2.2.5: verify party record created with initiator role', async () => {
    (prisma.dispute.create as any).mockResolvedValue({ id: 'd1', state: 'DRAFT', priceUsd: 49, parties: [], briefs: [], evaluatorOutputs: [], opinions: [], payments: [], documents: [], briefPrepSessions: [] });

    await createDispute('user_1', {
      category: 'CONTRACT_INTERPRETATION',
      title: 'Dispute with party verification',
    });

    const callArgs = (prisma.dispute.create as any).mock.calls[0][0].data;
    expect(callArgs.parties).toEqual({
      create: {
        role: 'INITIATOR',
        userId: 'user_1',
        briefStatus: 'NOT_STARTED',
      },
    });
  });

  it('rejects invalid input with ValidationError', async () => {
    await expect(
      createDispute('user_1', {
        category: 'CONTRACT_INTERPRETATION',
        title: 'AB',
      })
    ).rejects.toThrow(ValidationError);
  });
});
