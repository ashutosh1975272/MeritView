import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFeedback, getFeedbackForDispute } from '../../services/feedback';
import { prisma } from '../../db/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    feedback: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    dispute: {
      findUnique: vi.fn(),
    },
    party: {
      findMany: vi.fn(),
    },
  },
}));

describe('Feedback Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFeedback', () => {
    it('creates feedback for valid dispute and party', async () => {
      const mockDispute = {
        id: 'disp_1',
        deletedAt: null,
        state: 'COMPLETED',
        parties: [{ userId: 'user_1' }],
      };
      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
      (prisma.feedback.findFirst as any).mockResolvedValue(null);
      (prisma.feedback.create as any).mockResolvedValue({
        id: 'fbk_1',
        disputeId: 'disp_1',
        userId: 'user_1',
        rating: 5,
        comment: 'Great analysis',
      });

      const result = await createFeedback('disp_1', 'user_1', 5, 'Great analysis');

      expect(result.id).toBe('fbk_1');
      expect(result.rating).toBe(5);
      expect(prisma.feedback.create).toHaveBeenCalled();
    });

    it('throws BadRequestError for rating out of range', async () => {
      await expect(createFeedback('disp_1', 'user_1', 0)).rejects.toThrow(BadRequestError);
      await expect(createFeedback('disp_1', 'user_1', 6)).rejects.toThrow(BadRequestError);
    });

    it('throws ForbiddenError when user is not a party', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        deletedAt: null,
        state: 'COMPLETED',
        parties: [{ userId: 'user_2' }],
      });

      await expect(createFeedback('disp_1', 'user_1', 5)).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError for non-completed dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        deletedAt: null,
        state: 'DRAFT',
        parties: [{ userId: 'user_1' }],
      });

      await expect(createFeedback('disp_1', 'user_1', 5)).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError for duplicate feedback', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        deletedAt: null,
        state: 'COMPLETED',
        parties: [{ userId: 'user_1' }],
      });
      (prisma.feedback.findFirst as any).mockResolvedValue({ id: 'fbk_old' });

      await expect(createFeedback('disp_1', 'user_1', 5)).rejects.toThrow(BadRequestError);
    });
  });

  describe('getFeedbackForDispute', () => {
    it('returns feedbacks for authorized user', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        deletedAt: null,
        initiator: { id: 'user_1' },
        parties: [{ userId: 'user_1' }],
      });
      (prisma.feedback.findMany as any).mockResolvedValue([
        { id: 'fbk_1', rating: 5, comment: 'Good', createdAt: new Date(), user: { displayName: 'Alice' } },
      ]);

      const result = await getFeedbackForDispute('disp_1', 'user_1');

      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(5);
    });

    it('throws ForbiddenError when user is not party to dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        deletedAt: null,
        initiator: { id: 'user_2' },
        parties: [{ userId: 'user_2' }],
      });

      await expect(getFeedbackForDispute('disp_1', 'user_1')).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError for non-existent dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);

      await expect(getFeedbackForDispute('missing', 'user_1')).rejects.toThrow(NotFoundError);
    });
  });
});
