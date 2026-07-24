import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import { createEvaluationJob, getEvaluationStatus } from '../../services/evaluation';
import { getBrief } from '../../services/briefs';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

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

      const brief = await getBrief(req.user!.id, party.id, disputeId);
      const sanitizedContent = sanitizeForEvaluation(JSON.stringify(brief.sections));

      const result = await createEvaluationJob({
        disputeId,
        briefContent: sanitizedContent,
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

function sanitizeForEvaluation(content: string): string {
  const sensitivePatterns = [
    /jwt_token\s*[:=]\s*['"][^'"]+['"]/gi,
    /api_key\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi,
  ];

  let sanitized = content;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

export { router as evaluationRouter };
