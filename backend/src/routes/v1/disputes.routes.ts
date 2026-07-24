import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireEmailVerified, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import {
  createDispute,
  getDisputes,
  getDispute,
  updateDispute,
  withdrawDispute,
} from '../../services/disputes';
import { logger } from '../../utils/logger';
import { ConflictError, NotFoundError, ForbiddenError } from '../../utils/errors';

const router = Router() as ReturnType<typeof Router>;

const createDisputeSchema = z.object({
  body: z.object({
    category: z.enum(['contract_interpretation', 'small_claims_assessment', 'partnership_conflict']),
    title: z.string().min(5).max(200),
    summary: z.string().max(500).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
    pricingTier: z.enum(['STANDARD', 'EXPEDITED', 'EXTENDED', 'REANALYSIS']).optional(),
  }),
});

const updateDisputeSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    summary: z.string().max(500).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
  }),
  params: z.object({
    disputeId: z.string(),
  }),
});

const getDisputesSchema = z.object({
  query: z.object({
    state: z.string().optional(),
    category: z.string().optional(),
    limit: z.string().transform(v => parseInt(v, 10)).optional(),
    cursor: z.string().optional(),
  }),
});

router.get(
  '/',
  authRateLimiter,
  authMiddleware(),
  validate(getDisputesSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await getDisputes(req.user!.id, {
        state: req.query.state as any,
        category: req.query.category as any,
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
  '/:disputeId',
  authRateLimiter,
  authMiddleware(),
  validate(
    z.object({
      params: z.object({
        disputeId: z.string(),
      }),
    })
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await getDispute(req.user!.id, req.params.disputeId);
      res.json({ dispute });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authRateLimiter,
  authMiddleware(),
  requireEmailVerified,
  validate(createDisputeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await createDispute(req.user!.id, req.body);
      res.status(201).json({ dispute });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:disputeId',
  authRateLimiter,
  authMiddleware(),
  requireEmailVerified,
  validate(updateDisputeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await updateDispute(req.user!.id, req.params.disputeId, req.body);
      res.json({ dispute });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:disputeId/withdraw',
  authRateLimiter,
  authMiddleware(),
  validate(
    z.object({
      params: z.object({
        disputeId: z.string(),
      }),
    })
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await withdrawDispute(req.user!.id, req.params.disputeId);
      res.json({ dispute });
    } catch (error) {
      next(error);
    }
  }
);

export { router as disputesRouter };
