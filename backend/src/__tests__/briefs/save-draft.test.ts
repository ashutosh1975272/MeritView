import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveDraft } from '../../services/briefs';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { encrypt, getActiveKeyId } from '../../utils/crypto';

vi.mock('../../db/prisma', () => ({
  prisma: {
    party: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    brief: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    set: vi.fn(),
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

vi.mock('../../utils/crypto', () => ({
  encrypt: vi.fn(),
  getActiveKeyId: vi.fn(),
}));

describe('Briefs Service - saveDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParty = {
    id: 'party_1',
    userId: 'user_1',
    invitationEmail: null,
    disputeId: 'disp_1',
    briefStatus: 'NOT_STARTED',
    dispute: { id: 'disp_1', state: 'DRAFT' },
  };

  it('saves a draft for authorized party member', async () => {
    (prisma.party.findUnique as any).mockResolvedValue(baseParty);
    (prisma.brief.upsert as any).mockResolvedValue({ id: 'brief_1', partyId: 'party_1' });
    (encrypt as any).mockReturnValue({ encryptedContent: 'encrypted', contentEncryptionKeyId: 'key_1' });
    (getActiveKeyId as any).mockReturnValue('key_1');

    const result = await saveDraft('user_1', 'party_1', 'disp_1', {
      sections: {
        factual_background: 'Some background',
        my_position: 'My position',
        supporting_arguments: 'Args',
        acknowledgment_of_opposing: 'Opposing',
        desired_resolution: 'Resolution',
      },
    });

    expect(result.id).toBe('brief_1');
    expect(prisma.brief.upsert).toHaveBeenCalled();
  });

  it('throws NotFoundError when party not found', async () => {
    (prisma.party.findUnique as any).mockResolvedValue(null);
    await expect(
      saveDraft('user_1', 'party_1', 'disp_1', {
        sections: { factual_background: 'a', my_position: 'b', supporting_arguments: 'c', acknowledgment_of_opposing: 'd', desired_resolution: 'e' },
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when party disputeId does not match', async () => {
    (prisma.party.findUnique as any).mockResolvedValue({ ...baseParty, disputeId: 'disp_other' });
    await expect(
      saveDraft('user_1', 'party_1', 'disp_1', {
        sections: { factual_background: 'a', my_position: 'b', supporting_arguments: 'c', acknowledgment_of_opposing: 'd', desired_resolution: 'e' },
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when user is not a member and not counterparty', async () => {
    (prisma.party.findUnique as any).mockResolvedValue({ ...baseParty, userId: 'user_other', invitationEmail: 'other@example.com' });
    await expect(
      saveDraft('user_1', 'party_1', 'disp_1', {
        sections: { factual_background: 'a', my_position: 'b', supporting_arguments: 'c', acknowledgment_of_opposing: 'd', desired_resolution: 'e' },
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ConflictError when dispute is not in DRAFT or BRIEF_SUBMITTED state', async () => {
    (prisma.party.findUnique as any).mockResolvedValue({ ...baseParty, dispute: { id: 'disp_1', state: 'UNDER_ANALYSIS' } });
    await expect(
      saveDraft('user_1', 'party_1', 'disp_1', {
        sections: { factual_background: 'a', my_position: 'b', supporting_arguments: 'c', acknowledgment_of_opposing: 'd', desired_resolution: 'e' },
      })
    ).rejects.toThrow(ConflictError);
  });
});
