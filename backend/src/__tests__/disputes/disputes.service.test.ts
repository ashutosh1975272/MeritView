import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyDisputeAccess, getDisputesForParty, requestReanalysis } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    party: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('../../utils/audit', () => ({
  createAuditEvent: vi.fn(),
}));

vi.mock('../../jobs/queues', () => ({
  addEmailJob: vi.fn(),
}));

vi.mock('../../services/disputes/state-machine', () => ({
  validateTransition: vi.fn().mockReturnValue(true),
}));

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    PRICE_STANDARD: 49,
    PRICE_EXPEDITED: 99,
    PRICE_EXTENDED: 199,
    PRICE_REANALYSIS: 49,
  }),
}));

describe('Disputes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyDisputeAccess', () => {
    it('should return INITIATOR role for initiator user', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        initiatorUserId: 'user_123',
        parties: [],
      });

      const result = await verifyDisputeAccess('dispute_123', 'user_123');

      expect(result.role).toBe('INITIATOR');
    });

    it('should return RESPONDENT role for party user', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        initiatorUserId: 'initiator_123',
        parties: [{ role: 'RESPONDENT' }],
      });

      const result = await verifyDisputeAccess('dispute_123', 'respondent_456');

      expect(result.role).toBe('RESPONDENT');
    });

    it('should throw ForbiddenError for non-party user', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        initiatorUserId: 'initiator_123',
        parties: [],
      });

      await expect(verifyDisputeAccess('dispute_123', 'stranger')).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError for deleted dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);

      await expect(verifyDisputeAccess('missing_dispute', 'user_123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getDisputesForParty', () => {
    it('should return disputes where user is respondent', async () => {
      const mockDisputes = [
        { id: 'dispute_1', state: 'AWAITING_BRIEFS', initiator: { id: 'init_1', email: 'i1@test.com', displayName: 'Initiator 1' }, parties: [], payments: [] },
        { id: 'dispute_2', state: 'IN_PROGRESS', initiator: { id: 'init_2', email: 'i2@test.com', displayName: 'Initiator 2' }, parties: [], payments: [] },
      ];
      (prisma.dispute.findMany as any).mockResolvedValue(mockDisputes);

      const result = await getDisputesForParty('respondent_123');

      expect(result).toHaveLength(2);
      expect(prisma.dispute.findMany).toHaveBeenCalledWith({
        where: {
          parties: { some: { userId: 'respondent_123', role: 'RESPONDENT' } },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should return empty array when user has no respondent disputes', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      const result = await getDisputesForParty('user_without_disputes');

      expect(result).toEqual([]);
    });
  });

  describe('requestReanalysis', () => {
    it('should request reanalysis for completed dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        state: 'COMPLETED',
        initiatorUserId: 'user_123',
        deletedAt: null,
      });
      (prisma.dispute.update as any).mockResolvedValue({
        id: 'dispute_123',
        state: 'REANALYSIS_IN_PROGRESS',
      });

      const result = await requestReanalysis('dispute_123', 'user_123');

      expect(result.state).toBe('REANALYSIS_IN_PROGRESS');
      expect(result.disputeId).toBe('dispute_123');
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute_123' },
        data: { state: 'REANALYSIS_IN_PROGRESS', stateChangedAt: expect.any(Date) },
      });
    });

    it('should throw error for non-completed dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        state: 'DRAFT',
        initiatorUserId: 'user_123',
        deletedAt: null,
      });

      await expect(requestReanalysis('dispute_123', 'user_123')).rejects.toThrow(BadRequestError);
    });

    it('should throw error for non-initiator user', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'dispute_123',
        state: 'COMPLETED',
        initiatorUserId: 'owner_123',
        deletedAt: null,
      });

      await expect(requestReanalysis('dispute_123', 'stranger')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error for deleted dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);

      await expect(requestReanalysis('missing', 'user_123')).rejects.toThrow(NotFoundError);
    });
  });
});
