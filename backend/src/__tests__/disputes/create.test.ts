import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDispute, getDisputes, getDispute, updateDispute } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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

describe('Disputes Service - create/get/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDispute', () => {
    it('creates a dispute with valid input', async () => {
      const mockUser = { id: 'user_1', email: 'test@example.com' };
      const mockDispute = {
        id: 'disp_1',
        category: 'CONTRACT_INTERPRETATION',
        title: 'Employment dispute test',
        summary: null,
        estimatedStakesUsd: null,
        state: 'DRAFT',
        pricingTier: 'STANDARD',
        priceUsd: 49,
        createdAt: new Date(),
        updatedAt: new Date(),
        stateChangedAt: new Date(),
        completedAt: null,
        parties: [],
        briefs: [],
        evaluatorOutputs: [],
        opinions: [],
        payments: [],
        documents: [],
        briefPrepSessions: [],
        initiator: { id: 'user_1', email: 'test@example.com', displayName: 'Test', emailVerified: true },
      };

      (prisma.dispute.create as any).mockResolvedValue(mockDispute);

      const result = await createDispute('user_1', {
        category: 'CONTRACT_INTERPRETATION',
        title: 'Employment dispute test',
        pricingTier: 'STANDARD',
      });

      expect(result.id).toBe('disp_1');
      expect(result.state).toBe('DRAFT');
      expect(prisma.dispute.create).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Dispute created', { disputeId: 'disp_1', userId: 'user_1' });
    });

    it('throws ValidationError for title too short', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'AB',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for title too long', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'A'.repeat(201),
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for summary exceeding max length', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'Valid title for test',
          summary: 'A'.repeat(501),
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for negative estimated stakes', async () => {
      await expect(
        createDispute('user_1', {
          category: 'CONTRACT_INTERPRETATION',
          title: 'Valid title for test',
          estimatedStakesUsd: -1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getDisputes', () => {
    it('returns paginated disputes for user', async () => {
      const mockDisputes = [
        { id: 'disp_1', initiatorUserId: 'user_1', deletedAt: null, state: 'DRAFT', createdAt: new Date() },
        { id: 'disp_2', initiatorUserId: 'user_1', deletedAt: null, state: 'COMPLETED', createdAt: new Date() },
      ];

      (prisma.dispute.findMany as any).mockResolvedValue(mockDisputes);

      const result = await getDisputes('user_1', { limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('respects state filter', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);
      await getDisputes('user_1', { state: 'COMPLETED' });
      expect(prisma.dispute.findMany).toHaveBeenCalled();
    });

    it('respects category filter', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);
      await getDisputes('user_1', { category: 'CONTRACT_INTERPRETATION' });
      expect(prisma.dispute.findMany).toHaveBeenCalled();
    });

    it('sets hasMore when results exceed limit', async () => {
      const manyDisputes = Array.from({ length: 21 }, (_, i) => ({
        id: `disp_${i}`,
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        createdAt: new Date(),
      }));

      (prisma.dispute.findMany as any).mockResolvedValue(manyDisputes);

      const result = await getDisputes('user_1', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(manyDisputes[19].id);
    });

    it('caps limit at 100', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);
      await getDisputes('user_1', { limit: 999 });
      const callArgs = (prisma.dispute.findMany as any).mock.calls[0];
      expect(callArgs[0].take).toBeLessThanOrEqual(101);
    });
  });

  describe('getDispute', () => {
    it('returns dispute for authorized user', async () => {
      const mockDispute = {
        id: 'disp_1',
        initiatorUserId: 'user_1',
        deletedAt: null,
        state: 'DRAFT',
        initiator: { id: 'user_1', email: 'test@example.com', displayName: 'Test', emailVerified: true },
        parties: [],
        briefs: [],
        evaluatorOutputs: [],
        opinions: [],
        payments: [],
        documents: [],
        briefPrepSessions: [],
      };

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      const result = await getDispute('user_1', 'disp_1');

      expect(result.id).toBe('disp_1');
    });

    it('throws NotFoundError for deleted dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        initiatorUserId: 'user_1',
        deletedAt: new Date(),
      });

      await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError for non-existent dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);
      await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when user is not initiator', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        initiatorUserId: 'user_other',
        deletedAt: null,
      });

      await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateDispute', () => {
    const baseDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates a draft dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
      (prisma.dispute.update as any).mockResolvedValue({
        ...baseDispute,
        title: 'Updated title',
      });

      const result = await updateDispute('user_1', 'disp_1', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });

    it('throws NotFoundError for non-existent dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);
      await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when dispute is not in DRAFT state', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, state: 'COMPLETED' });
      await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(ConflictError);
    });

    it('throws ValidationError for title too short on update', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
      await expect(updateDispute('user_1', 'disp_1', { title: 'AB' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for negative estimatedStakesUsd on update', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
      await expect(updateDispute('user_1', 'disp_1', { estimatedStakesUsd: -5 })).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when another user tries to update', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, initiatorUserId: 'user_2' });
      await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(NotFoundError);
    });
  });
});
