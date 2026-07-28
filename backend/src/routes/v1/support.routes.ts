import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { supportMiddleware } from '../../middleware/admin';
import { validateQuery } from '../../middleware/validate';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';

const router: Router = Router();

const supportDisputesQuerySchema = z.object({
  state: z.string().optional(),
  email: z.string().email().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/v1/support/disputes',
  authMiddleware(),
  supportMiddleware,
  validateQuery(supportDisputesQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { state, email, page, limit } = req.query as unknown as z.infer<typeof supportDisputesQuerySchema>;

      const where: any = { deletedAt: null };

      if (state) {
        where.state = state;
      }

      if (email) {
        where.OR = [
          { initiator: { email: { equals: email, mode: 'insensitive' } } },
          { parties: { some: { user: { email: { equals: email, mode: 'insensitive' } } } } },
        ];
      }

      const [disputes, total] = await Promise.all([
        prisma.dispute.findMany({
          where,
          include: {
            initiator: { select: { id: true, email: true, displayName: true } },
            parties: {
              include: { user: { select: { id: true, email: true, displayName: true } } },
            },
            payments: { select: { id: true, status: true, amountUsd: true, createdAt: true } },
            _count: { select: { evaluatorOutputs: true, documents: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.dispute.count({ where }),
      ]);

      res.json({
        disputes,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as supportRouter };
