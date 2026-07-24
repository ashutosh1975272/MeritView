import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import {
  getPendingAggregations,
  publishOpinion,
  getAdminDisputes,
  getAdminDisputeDetail,
} from '../../services/aggregation';
import { logger } from '../../utils/logger';
import { ValidationError, ForbiddenError } from '../../utils/errors';

const router = Router() as ReturnType<typeof Router>;

router.use(authMiddleware());
router.use(requireRole('ADMIN'));

const disputeIdParamSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const listDisputesSchema = z.object({
  query: z.object({
    state: z.string().optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.string().transform(v => parseInt(v, 10)).optional(),
    cursor: z.string().optional(),
  }),
});

const aggregateSchema = z.object({
  body: z.object({
    content: z.object({
      executiveSummary: z.string().min(1),
      keyIssues: z.array(z.object({
        issue: z.string().min(1),
        agreementLevel: z.enum(['high', 'medium', 'low']),
      })).min(1),
      partyAAnalysis: z.object({
        strongestArguments: z.array(z.string()),
        weakestPoints: z.array(z.string()),
        factualConcerns: z.array(z.string()),
      }),
      partyBAnalysis: z.object({
        strongestArguments: z.array(z.string()),
        weakestPoints: z.array(z.string()),
        factualConcerns: z.array(z.string()),
      }),
      comparativeAssessment: z.string().min(1),
      confidenceIndicators: z.object({
        overallConfidence: z.number().min(0).max(1),
        evaluatorAgreement: z.number().min(0).max(1),
      }),
      suggestedConsiderations: z.object({
        partyA: z.array(z.string()),
        partyB: z.array(z.string()),
      }),
      disclaimers: z.array(z.string()).min(4),
    }),
    interEvaluatorAgreement: z.number().min(0).max(1),
    overallConfidence: z.number().min(0).max(1),
    aggregatorProvider: z.string().min(1),
    aggregatorModelId: z.string().min(1),
    totalCostUsd: z.number().min(0),
  }),
  params: z.object({
    id: z.string(),
  }),
});

router.get(
  '/disputes',
  authRateLimiter,
  validate(listDisputesSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await getAdminDisputes({
        state: req.query.state as any,
        category: req.query.category as any,
        dateFrom: req.query.dateFrom as any,
        dateTo: req.query.dateTo as any,
        limit: req.query.limit as any,
        cursor: req.query.cursor as any,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/disputes/:id',
  authRateLimiter,
  validate(disputeIdParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await getAdminDisputeDetail(req.params.id);
      res.json({ dispute });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/evaluations/pending',
  authRateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pending = await getPendingAggregations();
      res.json({ data: pending });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/disputes/:id/aggregate',
  authRateLimiter,
  validate(aggregateSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const opinion = await publishOpinion(req.user!.id, req.params.id, req.body);
      res.status(201).json({ opinion });
    } catch (error) {
      next(error);
    }
  }
);

export { router as adminRouter };
