import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { adminMiddleware, auditorMiddleware } from '../../middleware/admin';
import { validate, validateQuery } from '../../middleware/validate';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/errors';
import {
  getPendingAggregations,
  getDisputeWithEvaluations,
  generateOpinion,
  publishOpinion,
  unpublishOpinion,
} from '../../services/aggregation';

const router: Router = Router();

const uuidParam = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const adminDisputesQuerySchema = z.object({
  query: z.object({
    state: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
}).partial();

const generateOpinionSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Opinion content is required'),
    disclaimers: z.array(z.string()).min(4, 'All 4 standard disclaimers are required'),
    aggregatorProvider: z.string().min(1),
    aggregatorModelId: z.string().min(1),
    interEvaluatorAgreement: z.number().min(0).max(1).optional(),
    overallConfidence: z.number().min(0).max(1).optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

router.get(
  '/admin/disputes',
  authMiddleware(),
  auditorMiddleware,
  validateQuery(adminDisputesQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { state, dateFrom, dateTo, search, page, limit } = req.query as any;

      const where: any = { deletedAt: null };

      if (state) {
        where.state = state;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [disputes, total] = await Promise.all([
        prisma.dispute.findMany({
          where,
          include: {
            _count: { select: { evaluatorOutputs: true, parties: true } },
            parties: { select: { id: true, role: true, userId: true, briefStatus: true } },
            opinions: { select: { id: true, deliveredAt: true, createdAt: true } },
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

router.get(
  '/admin/disputes/:disputeId',
  authMiddleware(),
  auditorMiddleware,
  validate(z.object({ params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }) })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const dispute = await getDisputeWithEvaluations(disputeId);
      res.json(dispute);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/admin/aggregations/pending',
  authMiddleware(),
  auditorMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pending = await getPendingAggregations();
      res.json({ pending, count: pending.length });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/aggregations/:disputeId/publish',
  authMiddleware(),
  adminMiddleware,
  validate(generateOpinionSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const adminId = req.user!.id;

      const opinion = await generateOpinion(disputeId, adminId, req.body);
      const published = await publishOpinion(disputeId, adminId);

      logger.info('Aggregation published', { disputeId, adminId, opinionId: opinion.id });

      res.status(201).json({
        message: 'Opinion generated and published successfully',
        opinion: published,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/aggregations/:disputeId/unpublish',
  authMiddleware(),
  adminMiddleware,
  validate(uuidParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const adminId = req.user!.id;

      const opinion = await unpublishOpinion(disputeId, adminId);

      res.json({
        message: 'Opinion unpublished successfully',
        opinion,
      });
    } catch (error) {
      next(error);
    }
  }
);

const auditEventsQuerySchema = z.object({
  query: z.object({
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
    eventType: z.string().optional(),
    actorId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

router.get(
  '/admin/audit-events',
  authMiddleware(),
  auditorMiddleware,
  validateQuery(auditEventsQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { resourceType, resourceId, eventType, actorId, page, limit } = req.query as any;

      const where: any = {};
      if (resourceType) where.resourceType = resourceType;
      if (resourceId) where.resourceId = resourceId;
      if (eventType) where.eventType = eventType;
      if (actorId) where.actorId = actorId;

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.auditEvent.count({ where }),
      ]);

      res.json({
        events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as adminRouter };
