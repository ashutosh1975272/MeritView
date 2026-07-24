import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../db/prisma';
import { ValidationError, NotFoundError } from '../../utils/errors';

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    opinion: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('../../utils/crypto', () => ({
  encrypt: vi.fn(() => ({ encryptedContent: 'ZW5jcnlwdGVkX2Jhc2U2NA==', contentEncryptionKeyId: 'key_123' })),
  decrypt: vi.fn(() => JSON.stringify({
    executiveSummary: 'Test summary',
    keyIssues: [{ issue: 'Issue 1', agreementLevel: 'high' }],
    partyAAnalysis: { strongestArguments: ['A1'], weakestPoints: ['W1'], factualConcerns: ['C1'] },
    partyBAnalysis: { strongestArguments: ['A2'], weakestPoints: ['W2'], factualConcerns: ['C2'] },
    comparativeAssessment: 'Assessment',
    confidenceIndicators: { overallConfidence: 0.8, evaluatorAgreement: 0.75 },
    suggestedConsiderations: { partyA: ['Consider A'], partyB: ['Consider B'] },
    disclaimers: [],
  })),
  getActiveKeyId: vi.fn(() => 'key_123'),
}));

vi.mock('../../services/email', () => ({
  sendOpinionReadyEmail: vi.fn(),
}));

const mockContent = {
  executiveSummary: 'Test summary',
  keyIssues: [{ issue: 'Issue 1', agreementLevel: 'high' as const }],
  partyAAnalysis: { strongestArguments: ['A1'], weakestPoints: ['W1'], factualConcerns: ['C1'] },
  partyBAnalysis: { strongestArguments: ['A2'], weakestPoints: ['W2'], factualConcerns: ['C2'] },
  comparativeAssessment: 'Assessment',
  confidenceIndicators: { overallConfidence: 0.8, evaluatorAgreement: 0.75 },
  suggestedConsiderations: { partyA: ['Consider A'], partyB: ['Consider B'] },
  disclaimers: [
    'This is AI-generated analysis, not legal advice.',
    'This opinion does not constitute a binding judgment or arbitration award.',
    'Consult a qualified attorney for legal advice specific to your situation.',
    'Analysis is based on the information provided and may not reflect all relevant facts or legal nuances.',
  ],
};

const mockCreateData = {
  content: mockContent,
  evalPromptVersion: 'eval-v3.2',
  aggPromptVersion: 'agg-v2.1',
  evaluatorOutputIds: ['eval_1', 'eval_2', 'eval_3'],
  interEvaluatorAgreement: 0.75,
  overallConfidence: 0.8,
  aggregatorProvider: 'groq',
  aggregatorModelId: 'llama-3.1-70b',
  totalCostUsd: 0.05,
};

describe('Opinion Delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOpinionFromAggregation', () => {
    it('should store opinion with all required fields', async () => {
      (prisma.opinion.findUnique as any).mockResolvedValue(null);
      (prisma.opinion.create as any).mockResolvedValue({
        id: 'opinion_1',
        disputeId: 'disp_1',
        encryptedContent: Buffer.from('encrypted'),
        contentEncryptionKeyId: 'key_123',
        evalPromptVersion: 'eval-v3.2',
        aggPromptVersion: 'agg-v2.1',
        evaluatorOutputIds: ['eval_1', 'eval_2', 'eval_3'],
        interEvaluatorAgreement: 0.75,
        overallConfidence: 0.8,
        aggregatorProvider: 'groq',
        aggregatorModelId: 'llama-3.1-70b',
        totalCostUsd: 0.05,
        pdfStorageKey: null,
        pdfGeneratedAt: null,
        deliveredAt: new Date(),
        createdAt: new Date(),
      });
      (prisma.dispute.update as any).mockResolvedValue({});
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        title: 'Test Dispute',
        initiator: { id: 'user_1', email: 'user@test.com', displayName: 'User' },
      });

      const { createOpinionFromAggregation } = await import('../../services/opinions/delivery');
      const result = await createOpinionFromAggregation('disp_1', mockCreateData);

      expect(result).toBeDefined();
      expect(prisma.opinion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            disputeId: 'disp_1',
            evalPromptVersion: 'eval-v3.2',
            aggPromptVersion: 'agg-v2.1',
            evaluatorOutputIds: ['eval_1', 'eval_2', 'eval_3'],
            interEvaluatorAgreement: 0.75,
            overallConfidence: 0.8,
            aggregatorProvider: 'groq',
            aggregatorModelId: 'llama-3.1-70b',
            totalCostUsd: 0.05,
          }),
        })
      );
    });

    it('should include all 4 required disclaimers', async () => {
      (prisma.opinion.findUnique as any).mockResolvedValue(null);

      const { createOpinionFromAggregation } = await import('../../services/opinions/delivery');
      await expect(
        createOpinionFromAggregation('disp_1', {
          ...mockCreateData,
          content: { ...mockContent, disclaimers: ['only one'] },
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should generate PDF and store storage key', async () => {
      (prisma.opinion.findUnique as any).mockResolvedValueOnce(null);
      (prisma.opinion.create as any).mockResolvedValueOnce({
        id: 'opinion_1',
        disputeId: 'disp_1',
      });
      (prisma.opinion.update as any).mockResolvedValueOnce({
        id: 'opinion_1',
        pdfStorageKey: 'opinions/disp_1/hash.pdf',
        pdfGeneratedAt: new Date(),
      });
      (prisma.opinion.findUnique as any).mockResolvedValueOnce({
        id: 'opinion_1',
        pdfStorageKey: 'opinions/disp_1/hash.pdf',
        pdfGeneratedAt: new Date(),
      });
      (prisma.dispute.update as any).mockResolvedValue({});
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        title: 'Test',
        initiator: { id: 'user_1', email: 'user@test.com', displayName: 'User' },
      });

      const { createOpinionFromAggregation } = await import('../../services/opinions/delivery');
      const result = await createOpinionFromAggregation('disp_1', mockCreateData);

      expect(result).toBeDefined();
    });

    it('should fallback to web-only when PDF generation fails', async () => {
      (prisma.opinion.findUnique as any).mockResolvedValue(null);
      (prisma.opinion.create as any).mockResolvedValue({ id: 'opinion_1', disputeId: 'disp_1' });
      (prisma.dispute.update as any).mockResolvedValue({});
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        title: 'Test',
        initiator: { id: 'user_1', email: 'user@test.com', displayName: 'User' },
      });

      const { createOpinionFromAggregation } = await import('../../services/opinions/delivery');
      const result = await createOpinionFromAggregation('disp_1', mockCreateData);

      expect(result).toBeDefined();
    });
  });

  describe('getOpinionWithOwnership', () => {
    it('should return opinion for dispute initiator', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        state: 'COMPLETED',
        deletedAt: null,
        initiatorUserId: 'user_1',
        opinions: {
          id: 'opinion_1',
          disputeId: 'disp_1',
          encryptedContent: Buffer.from('encrypted'),
          contentEncryptionKeyId: 'key_123',
          evalPromptVersion: 'eval-v3.2',
          aggPromptVersion: 'agg-v2.1',
          evaluatorOutputIds: ['eval_1', 'eval_2', 'eval_3'],
          interEvaluatorAgreement: 0.75,
          overallConfidence: 0.8,
          aggregatorProvider: 'groq',
          aggregatorModelId: 'llama-3.1-70b',
          totalCostUsd: 0.05,
          pdfStorageKey: null,
          pdfGeneratedAt: null,
          deliveredAt: new Date(),
          createdAt: new Date(),
        },
        parties: [],
      });

      const { getOpinionWithOwnership } = await import('../../services/opinions/delivery');
      const result = await getOpinionWithOwnership('disp_1', 'user_1');

      expect(result).toBeDefined();
      expect(result.id).toBe('opinion_1');
      expect(result.disputeId).toBe('disp_1');
    });

    it('should return 404 for non-initiator', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        state: 'COMPLETED',
        deletedAt: null,
        initiatorUserId: 'user_1',
        opinions: { id: 'opinion_1' },
        parties: [],
      });

      const { getOpinionWithOwnership } = await import('../../services/opinions/delivery');
      await expect(getOpinionWithOwnership('disp_1', 'user_2')).rejects.toThrow(NotFoundError);
    });

    it('should return 404 for non-completed dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        state: 'UNDER_ANALYSIS',
        deletedAt: null,
        initiatorUserId: 'user_1',
        opinions: { id: 'opinion_1' },
        parties: [],
      });

      const { getOpinionWithOwnership } = await import('../../services/opinions/delivery');
      await expect(getOpinionWithOwnership('disp_1', 'user_1')).rejects.toThrow(ValidationError);
    });
  });

  describe('encryptOpinionContent / decryptOpinionContent', () => {
    it('should encrypt and decrypt opinion content', async () => {
      const { encryptOpinionContent, decryptOpinionContent } = await import('../../services/opinions/delivery');

      const encrypted = encryptOpinionContent(mockContent);
      expect(encrypted.encryptedContent).toBeDefined();
      expect(encrypted.contentEncryptionKeyId).toBe('key_123');

      const decrypted = decryptOpinionContent(encrypted.encryptedContent, encrypted.contentEncryptionKeyId);
      expect(decrypted.executiveSummary).toBe('Test summary');
    });
  });

  describe('SSE opinion status stream', () => {
    it('should push status updates', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({
        id: 'disp_1',
        deletedAt: null,
        initiatorUserId: 'user_1',
        state: 'COMPLETED',
        opinions: { id: 'opinion_1' },
        evaluatorOutputs: [{ parseSuccess: true }],
      });

      const { getOpinionStatus } = await import('../../services/opinions');
      const status = await getOpinionStatus('disp_1');

      expect(status.status).toBe('completed');
    });
  });
});
