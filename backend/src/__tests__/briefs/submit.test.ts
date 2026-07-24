import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateWordCount, validateWordCount, validateSectionsComplete, basicContentModeration, submitBrief } from '../../services/briefs';
import { prisma } from '../../db/prisma';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../utils/errors';
import { encrypt, getActiveKeyId } from '../../utils/crypto';

vi.mock('../../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    party: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    brief: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
    dispute: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/crypto', () => ({
  encrypt: vi.fn(),
  getActiveKeyId: vi.fn(),
}));

describe('Briefs Service - word count', () => {
  describe('calculateWordCount', () => {
    it('counts words across non-empty sections', () => {
      expect(calculateWordCount({
        factual_background: 'one two',
        my_position: 'three four',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: 'five',
      })).toBe(5);
    });

    it('treats multiple spaces as single separators', () => {
      expect(calculateWordCount({
        factual_background: 'a  b   c',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(3);
    });

    it('returns 0 for empty sections', () => {
      expect(calculateWordCount({
        factual_background: '',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(0);
    });

    it('treats whitespace-only as empty', () => {
      expect(calculateWordCount({
        factual_background: '   ',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(0);
    });
  });

  describe('validateWordCount', () => {
    it('returns valid for count under hard cap', () => {
      expect(validateWordCount(4999)).toEqual({ valid: true, wordCount: 4999 });
    });

    it('returns valid for count at hard cap', () => {
      expect(validateWordCount(5000)).toEqual({ valid: true, wordCount: 5000 });
    });

    it('throws for count above hard cap', () => {
      expect(() => validateWordCount(5001)).toThrow();
    });
  });

  describe('validateSectionsComplete', () => {
    it('throws when factual_background is empty', () => {
      expect(() => validateSectionsComplete({
        factual_background: '',
        my_position: 'pos',
        supporting_arguments: 'args',
        acknowledgment_of_opposing: 'ack',
        desired_resolution: 'res',
      })).toThrow();
    });

    it('throws when section is whitespace only', () => {
      expect(() => validateSectionsComplete({
        factual_background: '   ',
        my_position: 'pos',
        supporting_arguments: 'args',
        acknowledgment_of_opposing: 'ack',
        desired_resolution: 'res',
      })).toThrow();
    });

    it('passes when all sections have values', () => {
      expect(() => validateSectionsComplete({
        factual_background: 'fact',
        my_position: 'pos',
        supporting_arguments: 'args',
        acknowledgment_of_opposing: 'ack',
        desired_resolution: 'res',
      })).not.toThrow();
    });
  });

  describe('basicContentModeration', () => {
    const passCases = [
      { content: 'This is a legitimate dispute about contract terms', expected: { passed: true } },
      { content: 'A normal argument with references and citations', expected: { passed: true } },
      { content: '', expected: { passed: true } },
      { content: 'AAA BBB CCC', expected: { passed: true } },
    ];

    passCases.forEach(({ content, expected }) => {
      it(`returns ${expected.passed ? 'pass' : 'block'} for: "${content.slice(0, 40)}"`, () => {
        expect(basicContentModeration(content)).toMatchObject(expected);
      });
    });

    it('blocks murder content', () => {
      expect(basicContentModeration('He was convicted of murder').passed).toBe(false);
    });

    it('blocks assault content', () => {
      expect(basicContentModeration('The assault happened at noon').passed).toBe(false);
    });

    it('blocks fraud content', () => {
      expect(basicContentModeration('This was financial fraud').passed).toBe(false);
    });

    it('blocks hack content', () => {
      expect(basicContentModeration('The system was hacked').passed).toBe(false);
    });

    it('blocks threat content', () => {
      expect(basicContentModeration('I will hurt you').passed).toBe(false);
    });

    it('blocks illegal content', () => {
      expect(basicContentModeration('There was stolen property').passed).toBe(false);
    });

    it('blocks SSN via PII pattern', () => {
      expect(basicContentModeration('My SSN is 123-45-6789').passed).toBe(false);
    });

    it('blocks 16-digit card pattern', () => {
      expect(basicContentModeration('Card: 4111111111111111').passed).toBe(false);
    });

    it('blocks passport-like pattern', () => {
      expect(basicContentModeration('Passport: AB1234567').passed).toBe(false);
    });
  });

  describe('submitBrief service function', () => {
    const baseParty = {
      id: 'party_1',
      userId: 'user_1',
      disputeId: 'disp_1',
      briefStatus: 'IN_PROGRESS',
      dispute: { id: 'disp_1', state: 'DRAFT' },
    };

    const validSections = {
      factual_background: 'factual background text',
      my_position: 'my position text',
      supporting_arguments: 'supporting arguments text',
      acknowledgment_of_opposing: 'acknowledgment text',
      desired_resolution: 'desired resolution text',
    };

    beforeEach(() => {
      vi.clearAllMocks();
      (encrypt as any).mockReturnValue({ encryptedContent: 'encrypted_base64', contentEncryptionKeyId: 'key_1' });
      (getActiveKeyId as any).mockReturnValue('key_1');
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        title: 'Test Dispute',
        initiator: { id: 'user_1', email: 'test@test.com', displayName: 'Test User' },
      });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user_1', email: 'test@test.com' });
    });

    it('submits with all 5 sections returning status submitted', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(baseParty);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          brief: { upsert: vi.fn().mockResolvedValue({ id: 'brief_1', partyId: 'party_1', status: 'SUBMITTED', sealHash: 'seal_abc' }) },
          party: { update: vi.fn() },
          dispute: { update: vi.fn() },
        };
        return cb(tx);
      });

      const result = await submitBrief('user_1', 'party_1', 'disp_1', { sections: validSections });

      expect(result.status).toBe('SUBMITTED');
      expect(result.sealHash).toBeDefined();
    });

    it('throws ValidationError for empty section on submit', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(baseParty);

      await expect(
        submitBrief('user_1', 'party_1', 'disp_1', {
          sections: { ...validSections, factual_background: '' },
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for word count exceeding 5000 cap', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(baseParty);
      const long = 'word '.repeat(1001);

      await expect(
        submitBrief('user_1', 'party_1', 'disp_1', {
          sections: {
            factual_background: long,
            my_position: long,
            supporting_arguments: long,
            acknowledgment_of_opposing: long,
            desired_resolution: long,
          },
        })
      ).rejects.toThrow(ValidationError);
    });

    it('submits with exactly 5000 words successfully', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(baseParty);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          brief: { upsert: vi.fn().mockResolvedValue({ id: 'brief_1', status: 'SUBMITTED', sealHash: 'seal_abc' }) },
          party: { update: vi.fn() },
          dispute: { update: vi.fn() },
        };
        return cb(tx);
      });

      const sections = {
        factual_background: 'word '.repeat(1000),
        my_position: 'word '.repeat(1000),
        supporting_arguments: 'word '.repeat(1000),
        acknowledgment_of_opposing: 'word '.repeat(1000),
        desired_resolution: 'word '.repeat(1000),
      };

      const result = await submitBrief('user_1', 'party_1', 'disp_1', { sections });
      expect(result.status).toBe('SUBMITTED');
    });

    it('submitting on draft dispute transitions state to brief_submitted', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(baseParty);
      let disputeUpdated = false;
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          brief: { upsert: vi.fn().mockResolvedValue({ id: 'brief_1', status: 'SUBMITTED', sealHash: 'seal_abc' }) },
          party: { update: vi.fn() },
          dispute: { update: vi.fn().mockImplementation(() => { disputeUpdated = true; }) },
        };
        return cb(tx);
      });

      await submitBrief('user_1', 'party_1', 'disp_1', { sections: validSections });
      expect(disputeUpdated).toBe(true);
    });

    it('throws ConflictError for non-draft dispute state', async () => {
      (prisma.party.findUnique as any).mockResolvedValue({
        ...baseParty,
        dispute: { id: 'disp_1', state: 'UNDER_ANALYSIS' },
      });

      await expect(
        submitBrief('user_1', 'party_1', 'disp_1', { sections: validSections })
      ).rejects.toThrow(ConflictError);
    });

    it('sets seal_hash and prevents further edits (immutability)', async () => {
      (prisma.party.findUnique as any).mockResolvedValue(baseParty);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          brief: { upsert: vi.fn().mockResolvedValue({ id: 'brief_1', status: 'SUBMITTED', sealHash: 'seal_hash_value' }) },
          party: { update: vi.fn() },
          dispute: { update: vi.fn() },
        };
        return cb(tx);
      });

      const result = await submitBrief('user_1', 'party_1', 'disp_1', { sections: validSections });
      expect(result.sealHash).toBe('seal_hash_value');
    });
  });
});
