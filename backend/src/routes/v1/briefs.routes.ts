import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import {
  saveDraft,
  submitBrief,
  getBrief,
  calculateWordCount,
} from '../../services/briefs';
import { logger } from '../../utils/logger';
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '../../utils/errors';

const router = Router() as ReturnType<typeof Router>;

router.use(authMiddleware());

const wordCountSchema = z.object({
  body: z.object({
    sections: z.object({
      factual_background: z.string().max(5000).optional(),
      my_position: z.string().max(5000).optional(),
      supporting_arguments: z.string().max(5000).optional(),
      acknowledgment_of_opposing: z.string().max(5000).optional(),
      desired_resolution: z.string().max(5000).optional(),
    }).partial(),
    supportingDocumentIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    disputeId: z.string().uuid(),
    partyId: z.string().uuid(),
  }),
});

const submitSchema = z.object({
  body: z.object({
    sections: z.object({
      factual_background: z.string().min(1).max(5000),
      my_position: z.string().min(1).max(5000),
      supporting_arguments: z.string().min(1).max(5000),
      acknowledgment_of_opposing: z.string().min(1).max(5000),
      desired_resolution: z.string().min(1).max(5000),
    }),
    supportingDocumentIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    disputeId: z.string().uuid(),
    partyId: z.string().uuid(),
  }),
});

router.put(
  '/:disputeId/parties/:partyId/brief/draft',
  authRateLimiter,
  validate(wordCountSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const brief = await saveDraft(req.user!.id, partyId, disputeId, req.body);
      res.json(brief);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:disputeId/parties/:partyId/brief/submit',
  authRateLimiter,
  validate(submitSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const result = await submitBrief(req.user!.id, partyId, disputeId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:disputeId/parties/:partyId/brief',
  authRateLimiter,
  validate(
    z.object({
      params: z.object({
        disputeId: z.string().uuid(),
        partyId: z.string().uuid(),
      }),
    })
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const brief = await getBrief(req.user!.id, partyId, disputeId);
      res.json(brief);
    } catch (error) {
      next(error);
    }
  }
);

export { router as briefsRouter };
