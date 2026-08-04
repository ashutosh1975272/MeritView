import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { verifyDisputeOwnership } from '../../services/disputes/index.js';
import { createFeedback, getFeedbackForDispute } from '../../services/feedback/index.js';
import { prisma } from '../../db/prisma.js';
import { ForbiddenError } from '../../utils/errors.js';

const router = Router();

router.post(
  '/v1/disputes/:disputeId/feedback',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const userId = req.user!.id;

      const { rating, comment } = req.body ?? {};

      if (typeof rating !== 'number') {
        return res.status(400).json({ error: { message: 'rating is required and must be a number' } });
      }

      const result = await createFeedback(disputeId, userId, rating, comment);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/disputes/:disputeId/feedback',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const userId = req.user!.id;

      const result = await getFeedbackForDispute(disputeId, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export { router as feedbackRouter };
