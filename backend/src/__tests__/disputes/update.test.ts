import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateDispute } from '../../services/disputes';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
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

describe('Disputes Service - update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseDispute = {
    id: 'disp_1',
    initiatorUserId: 'user_1',
    deletedAt: null,
    state: 'DRAFT' as const,
  };

  it('updates title without errors', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    (prisma.dispute.update as any).mockResolvedValue({ ...baseDispute, title: 'New Title' });

    const result = await updateDispute('user_1', 'disp_1', { title: 'New Title' });
    expect(result.title).toBe('New Title');
    expect(logger.info).toHaveBeenCalledWith('Dispute updated', { disputeId: 'disp_1', userId: 'user_1' });
  });

  it('updates summary without errors', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    (prisma.dispute.update as any).mockResolvedValue({ ...baseDispute, summary: 'New summary' });

    const result = await updateDispute('user_1', 'disp_1', { summary: 'New summary' });
    expect(result.summary).toBe('New summary');
  });

  it('updates estimatedStakesUsd', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    (prisma.dispute.update as any).mockResolvedValue({ ...baseDispute });

    await updateDispute('user_1', 'disp_1', { estimatedStakesUsd: 5000 });
    expect(prisma.dispute.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estimatedStakesUsd: expect.any(Object) }),
      })
    );
  });

  it('throws NotFoundError for non-existent dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(null);
    await expect(updateDispute('user_1', 'disp_1', { title: 'New Title' })).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when dispute is not in DRAFT state', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, state: 'PAYMENT_PENDING' });
    await expect(updateDispute('user_1', 'disp_1', { title: 'New Title' })).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when dispute is in COMPLETED state', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, state: 'COMPLETED' });
    await expect(updateDispute('user_1', 'disp_1', { title: 'New Title' })).rejects.toThrow(ConflictError);
  });

  it('throws ValidationError when new title is too short', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    await expect(updateDispute('user_1', 'disp_1', { title: 'AB' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when new title is too long', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    await expect(updateDispute('user_1', 'disp_1', { title: 'A'.repeat(201) })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when summary is too long', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    await expect(updateDispute('user_1', 'disp_1', { summary: 'A'.repeat(501) })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for negative estimatedStakesUsd', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue(baseDispute);
    await expect(updateDispute('user_1', 'disp_1', { estimatedStakesUsd: -1 })).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when another user tries to update', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, initiatorUserId: 'user_2' });
    await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for deleted dispute', async () => {
    (prisma.dispute.findUnique as any).mockResolvedValue({ ...baseDispute, deletedAt: new Date() });
    await expect(updateDispute('user_1', 'disp_1', { title: 'New' })).rejects.toThrow(NotFoundError);
  });
});
