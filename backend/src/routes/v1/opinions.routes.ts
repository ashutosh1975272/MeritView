import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import {
  getOpinion,
  generateOpinionPdf,
  getOpinionStatus,
  subscribeOpinionStatus,
} from '../../services/opinions';
import { logger } from '../../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';

const router = Router() as ReturnType<typeof Router>;

router.use(authMiddleware());

const disputeParamSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

router.get(
  '/:disputeId/opinion',
  authRateLimiter,
  validate(disputeParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const opinion = await getOpinion(req.params.disputeId, req.user!.id);
      res.json({ opinion });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:disputeId/opinion/pdf',
  authRateLimiter,
  validate(disputeParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pdfBuffer = await generateOpinionPdf(req.params.disputeId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="opinion-${req.params.disputeId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:disputeId/opinion/status',
  authRateLimiter,
  validate(disputeParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await getOpinionStatus(req.params.disputeId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:disputeId/opinion/status/stream',
  authRateLimiter,
  validate(disputeParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const cleanup = await subscribeOpinionStatus(
        req.params.disputeId,
        req.user!.id,
        (data) => {
          res.write(`data: ${data}\n\n`);
        },
        () => {
          res.write('data: [DONE]\n\n');
          res.end();
        },
        (error) => {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        }
      );

      req.on('close', () => {
        cleanup();
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as opinionsRouter };
