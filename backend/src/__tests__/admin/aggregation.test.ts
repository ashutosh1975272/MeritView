import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminDisputes, getAdminDisputeDetail, publishOpinion, getPendingAggregations } from '../../services/aggregation';
import { prisma } from '../../db/prisma';
import { ValidationError, NotFoundError } from '../../utils/errors';

const { mockCreateOpinionAgg } = vi.hoisted(() => ({
  mockCreateOpinionAgg: vi.fn(),
}));

vi.mock('../../services/opinions', () => ({
  createOpinionFromAggregation: mockCreateOpinionAgg,
  OpinionContentData: {},
}));

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: {
      findMany: vi.fn(),
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
  encrypt: vi.fn(() => ({ encryptedContent: 'encrypted_base64', contentEncryptionKeyId: 'key_123' })),
  decrypt: vi.fn(() => JSON.stringify({ executiveSummary: 'test' })),
  getActiveKeyId: vi.fn(() => 'key_123'),
}));

vi.mock('../../prompts/agg-v2.1', () => ({
  AGG_PROMPT_VERSION: 'agg-v2.1',
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../middleware/auth', () => ({
  authMiddleware: vi.fn(() => (req: any, res: any, next: any) => {
    if (req.headers?.authorization?.startsWith('Bearer admin_token')) {
      req.user = { id: 'admin_1', role: 'ADMIN', email: 'admin@test.com', accountType: 'ADMIN', emailVerified: true };
    } else if (req.headers?.authorization?.startsWith('Bearer user_token')) {
      req.user = { id: 'user_1', role: 'STANDARD', email: 'user@test.com', accountType: 'STANDARD', emailVerified: true };
    }
    next();
  }),
  requireRole: vi.fn((...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const { ForbiddenError } = require('../../utils/errors');
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  }),
  AuthenticatedRequest: Object,
  requireEmailVerified: vi.fn((req: any, res: any, next: any) => next()),
  optionalAuth: vi.fn(),
}));

describe('Admin Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateOpinionAgg.mockReset();
  });

  describe('Admin Auth', () => {
    it('should reject non-admin users', async () => {
      const { adminAuth } = await import('../../middleware/adminAuth');

      const req = { headers: { authorization: 'Bearer user_token' } } as any;
      const res = {} as any;
      const next = vi.fn();

      adminAuth(req, res, next);

      const error = next.mock.calls[0]?.[0];
      expect(error).toBeDefined();
      expect(error.statusCode || 403).toBe(403);
    });

    it('should allow admin users through', async () => {
      const { adminAuth } = await import('../../middleware/adminAuth');

      const req = { headers: { authorization: 'Bearer admin_token' } } as any;
      const res = {} as any;
      const next = vi.fn();

      adminAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('getAdminDisputes', () => {
    it('should list disputes with filters', async () => {
      const mockDisputes = [
        { id: 'disp_1', title: 'Test Dispute', state: 'AWAITING_AGGREGATION', category: 'CONTRACT_INTERPRETATION', createdAt: new Date() },
      ];

      (prisma.dispute.findMany as any).mockResolvedValue(mockDisputes);

      const result = await getAdminDisputes({ state: 'AWAITING_AGGREGATION' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('disp_1');
      expect(prisma.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: 'AWAITING_AGGREGATION',
            deletedAt: null,
          }),
        })
      );
    });

    it('should apply date range filters', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getAdminDisputes({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(prisma.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should apply category filter', async () => {
      (prisma.dispute.findMany as any).mockResolvedValue([]);

      await getAdminDisputes({ category: 'SMALL_CLAIMS_ASSESSMENT' as any });

      expect(prisma.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'SMALL_CLAIMS_ASSESSMENT',
          }),
        })
      );
    });
  });

  describe('getAdminDisputeDetail', () => {
    it('should return dispute details', async () => {
      const mockDispute = {
        id: 'disp_1',
        title: 'Test',
        state: 'AWAITING_AGGREGATION',
        deletedAt: null,
        initiator: { id: 'user_1', email: 'test@test.com' },
        parties: [],
        briefs: [],
        evaluatorOutputs: [],
        opinions: null,
        payments: [],
        documents: [],
        briefPrepSessions: [],
      };

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      const result = await getAdminDisputeDetail('disp_1');
      expect(result.id).toBe('disp_1');
      expect(result.state).toBe('AWAITING_AGGREGATION');
    });

    it('should throw NotFoundError for deleted dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue({ id: 'disp_1', deletedAt: new Date() });

      await expect(getAdminDisputeDetail('disp_1')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for missing dispute', async () => {
      (prisma.dispute.findUnique as any).mockResolvedValue(null);

      await expect(getAdminDisputeDetail('disp_1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('publishOpinion', () => {
    const validData = {
      content: {
        executiveSummary: 'Summary',
        keyIssues: [{ issue: 'Issue 1', agreementLevel: 'high' as const }],
        partyAAnalysis: { strongestArguments: ['Arg 1'], weakestPoints: ['Weak 1'], factualConcerns: ['Concern 1'] },
        partyBAnalysis: { strongestArguments: ['Arg 2'], weakestPoints: ['Weak 2'], factualConcerns: ['Concern 2'] },
        comparativeAssessment: 'Assessment',
        confidenceIndicators: { overallConfidence: 0.8, evaluatorAgreement: 0.7 },
        suggestedConsiderations: { partyA: ['Consider A'], partyB: ['Consider B'] },
        disclaimers: ['Disclaimer 1', 'Disclaimer 2', 'Disclaimer 3', 'Disclaimer 4'],
      },
      interEvaluatorAgreement: 0.75,
      overallConfidence: 0.8,
      aggregatorProvider: 'groq',
      aggregatorModelId: 'llama-3.1-70b',
      totalCostUsd: 0.05,
    };

    it('should aggregate with 3+ outputs returning 200', async () => {
      const mockDispute = {
        id: 'disp_1',
        state: 'AWAITING_AGGREGATION',
        deletedAt: null,
        evaluatorOutputs: [
          { id: 'eval_1', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
          { id: 'eval_2', parseSuccess: true, costUsd: 0.02, promptVersion: 'eval-v3.2' },
          { id: 'eval_3', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
        ],
        opinions: null,
      };

      mockCreateOpinionAgg.mockResolvedValue({ id: 'opinion_1', disputeId: 'disp_1' });

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
      (prisma.dispute.update as any).mockResolvedValue({ ...mockDispute, state: 'COMPLETED' });
      (prisma.opinion.findUnique as any).mockResolvedValue({ id: 'opinion_1' });

      const result = await publishOpinion('admin_1', 'disp_1', validData);
      expect(result).toBeDefined();
    });

    it('should reject aggregation with fewer than 3 outputs', async () => {
      const mockDispute = {
        id: 'disp_1',
        state: 'AWAITING_AGGREGATION',
        deletedAt: null,
        evaluatorOutputs: [
          { id: 'eval_1', parseSuccess: true, costUsd: 0.01 },
          { id: 'eval_2', parseSuccess: false, costUsd: 0.02 },
        ],
        opinions: null,
      };

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      await expect(publishOpinion('admin_1', 'disp_1', validData)).rejects.toThrow(ValidationError);
    });

    it('should reject publish without disclaimers', async () => {
      const noDisclaimerData = {
        ...validData,
        content: { ...validData.content, disclaimers: [] },
      };

      mockCreateOpinionAgg.mockRejectedValue(new ValidationError('Opinion must include at least 4 disclaimers'));

      const mockDispute = {
        id: 'disp_1',
        state: 'AWAITING_AGGREGATION',
        deletedAt: null,
        evaluatorOutputs: [
          { id: 'eval_1', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
          { id: 'eval_2', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
          { id: 'eval_3', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
        ],
        opinions: null,
      };

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      await expect(publishOpinion('admin_1', 'disp_1', noDisclaimerData)).rejects.toThrow();
    });

    it('should reject publish with missing required fields', async () => {
      const incompleteData = {
        ...validData,
        content: { ...validData.content, executiveSummary: '' },
      };

      mockCreateOpinionAgg.mockRejectedValue(new ValidationError('Missing required fields'));

      const mockDispute = {
        id: 'disp_1',
        state: 'AWAITING_AGGREGATION',
        deletedAt: null,
        evaluatorOutputs: [
          { id: 'eval_1', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
          { id: 'eval_2', parseSuccess: true, costUsd: 0.02, promptVersion: 'eval-v3.2' },
          { id: 'eval_3', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
        ],
        opinions: null,
      };

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);

      await expect(publishOpinion('admin_1', 'disp_1', incompleteData)).rejects.toThrow();
    });

    it('should set state to completed on publish', async () => {
      const mockDispute = {
        id: 'disp_1',
        state: 'AWAITING_AGGREGATION',
        deletedAt: null,
        evaluatorOutputs: [
          { id: 'eval_1', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
          { id: 'eval_2', parseSuccess: true, costUsd: 0.02, promptVersion: 'eval-v3.2' },
          { id: 'eval_3', parseSuccess: true, costUsd: 0.01, promptVersion: 'eval-v3.2' },
        ],
        opinions: null,
      };

      mockCreateOpinionAgg.mockResolvedValue({ id: 'opinion_1', disputeId: 'disp_1' });

      (prisma.dispute.findUnique as any).mockResolvedValue(mockDispute);
      (prisma.dispute.update as any).mockResolvedValue({ ...mockDispute, state: 'COMPLETED', completedAt: new Date() });
      (prisma.opinion.findUnique as any).mockResolvedValue({ id: 'opinion_1' });

      await publishOpinion('admin_1', 'disp_1', validData);

      expect(prisma.dispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'disp_1' },
          data: expect.objectContaining({
            state: 'COMPLETED',
          }),
        })
      );
    });
  });

  describe('getPendingAggregations', () => {
    it('should return disputes awaiting aggregation', async () => {
      const mockDisputes = [
        {
          id: 'disp_1',
          title: 'Test',
          category: 'CONTRACT_INTERPRETATION',
          state: 'AWAITING_AGGREGATION',
          stateChangedAt: new Date(),
          evaluatorOutputs: [{ parseSuccess: true }, { parseSuccess: false }],
          initiator: { id: 'u1', email: 'a@b.com', displayName: 'User' },
          parties: [],
          createdAt: new Date(),
        },
      ];

      (prisma.dispute.findMany as any).mockResolvedValue(mockDisputes);

      const result = await getPendingAggregations();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('disp_1');
      expect(result[0].successfulEvaluatorOutputs).toBe(1);
    });
  });
});
