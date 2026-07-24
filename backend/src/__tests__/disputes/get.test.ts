import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDisputes, getDispute } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

describe('getDisputes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only the users own disputes excluding deleted', async () => {
    const mockDisputes = [
      { id: 'disp_1', initiatorUserId: 'user_1', deletedAt: null, state: 'DRAFT', createdAt: new Date(), parties: [], briefs: [], evaluatorOutputs: [], opinions: [], payments: [], documents: [], briefPrepSessions: [] },
      { id: 'disp_2', initiatorUserId: 'user_1', deletedAt: null, state: 'COMPLETED', createdAt: new Date(), parties: [], briefs: [], evaluatorOutputs: [], opinions: [], payments: [], documents: [], briefPrepSessions: [] },
    ];

    (prisma.dispute.findMany as any).mockResolvedValue(mockDisputes);

    const result = await getDisputes('user_1', {});

    expect(result.data).toHaveLength(2);
    expect(prisma.dispute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          initiatorUserId: 'user_1',
          deletedAt: null,
        }),
      })
    );
  });

  it('excludes deleted disputes', async () => {
    (prisma.dispute.findMany as any).mockResolvedValue([]);

    await getDisputes('user_1', {});

    expect(prisma.dispute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })
    );
  });

  it('does not return disputes belonging to other users', async () => {
    (prisma.dispute.findMany as any).mockResolvedValue([]);

    await getDisputes('user_1', {});
    const callArgs = (prisma.dispute.findMany as any).mock.calls[0];

    expect(callArgs[0].where.initiatorUserId).toBe('user_1');
  });

  it('returns empty array when user has no disputes', async () => {
    (prisma.dispute.findMany as any).mockResolvedValue([]);

    const result = await getDisputes('user_1', {});

    expect(result.data).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});

describe('getDispute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dispute with parties for the initiator', async () => {
    const mockDispute = {
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: null,
      state: 'DRAFT',
      category: 'CONTRACT_INTERPRETATION',
      title: 'Test dispute',
      summary: null,
      estimatedStakesUsd: null,
      pricingTier: 'STANDARD',
      priceUsd: 49,
      createdAt: new Date(),
      updatedAt: new Date(),
      stateChangedAt: new Date(),
      completedAt: null,
      initiator: { id: 'user_1', email: 'test@example.com', displayName: 'Test', emailVerified: true },
      parties: [
        { id: 'party_1', role: 'INITIATOR', userId: 'user_1', briefStatus: 'NOT_STARTED' },
      ],
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
    expect(result.parties).toHaveLength(1);
    expect(result.parties[0].role).toBe('INITIATOR');
  });

  it('throws NotFoundError when dispute does not exist', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);

    await expect(getDispute('user_1', 'invalid_id')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when user is not the initiator', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'disp_1',
      initiatorUserId: 'other_user',
      deletedAt: null,
    });

    await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for soft-deleted dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({
      id: 'disp_1',
      initiatorUserId: 'user_1',
      deletedAt: new Date(),
    });

    await expect(getDispute('user_1', 'disp_1')).rejects.toThrow(NotFoundError);
  });
});
