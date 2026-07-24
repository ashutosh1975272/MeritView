import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import { createEvaluationJob, getEvaluationStatus } from '../../services/evaluation';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

const router = Router() as ReturnType<typeof Router>;

router.use(authMiddleware());

const evaluateSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

const evaluationStatusSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

router.post(
  '/:disputeId/evaluate',
  authRateLimiter,
  validate(evaluateSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;

      const party = await prisma.party.findFirst({
        where: { disputeId, userId: req.user!.id },
      });

      if (!party) {
        throw new NotFoundError('Party not found for this dispute');
      }

      const result = await createEvaluationJob({
        disputeId,
        partyId: party.id,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:disputeId/evaluation/status',
  authRateLimiter,
  validate(evaluationStatusSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const status = await getEvaluationStatus(disputeId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

export { router as evaluationRouter };
