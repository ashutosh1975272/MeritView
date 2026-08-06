import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest, requireEmailVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createEvaluationJob, getEvaluationStatus } from '../../services/evaluation/index.js';
import { verifyDisputeAccess, verifyDisputeOwnership } from '../../services/disputes/index.js';
import { addEvaluationJob } from '../../jobs/queues.js';

const router: Router = Router();

const disputeIdParam = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

router.post(
  '/disputes/:disputeId/evaluate',
  authMiddleware(),
  requireEmailVerified,
  validate(disputeIdParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;

      await verifyDisputeOwnership(disputeId, req.user!.id);

      await createEvaluationJob(disputeId);

      await addEvaluationJob(disputeId, req.user!.id);

      res.status(202).json({
        message: 'Evaluation queued',
        disputeId,
        status: 'queued',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/disputes/:disputeId/evaluation/status',
  authMiddleware(),
  validate(disputeIdParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;

      await verifyDisputeAccess(disputeId, req.user!.id);

      const status = await getEvaluationStatus(disputeId);

      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

export { router as evaluationRouter };
