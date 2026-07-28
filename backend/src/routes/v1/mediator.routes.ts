import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { logger } from '../../utils/logger';
import {
  registerAsMediator,
  getMediator,
  getMyMediatorProfile,
  updateMediator,
  searchMediators,
  createPartnership,
  getPartnershipsForDispute,
} from '../../services/mediator';

const router: Router = Router();

const registerSchema = z.object({
  body: z.object({
    businessName: z.string().min(1).max(200),
    description: z.string().optional(),
    specialties: z.array(z.string().min(1)).min(1),
    serviceRegions: z.array(z.string().min(1)).min(1),
    contactEmail: z.string().email(),
    website: z.string().url().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    businessName: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    specialties: z.array(z.string().min(1)).optional(),
    serviceRegions: z.array(z.string().min(1)).optional(),
    contactEmail: z.string().email().optional(),
    website: z.string().url().optional(),
  }),
});

const searchQuerySchema = z.object({
  query: z.object({
    specialties: z.string().optional(),
    region: z.string().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

const mediatorIdParam = z.object({
  params: z.object({
    mediatorId: z.string().min(1),
  }),
});

const disputeIdParam = z.object({
  params: z.object({
    disputeId: z.string().min(1),
  }),
});

const createPartnershipSchema = z.object({
  body: z.object({
    mediatorId: z.string().min(1),
  }),
  params: z.object({
    disputeId: z.string().min(1),
  }),
});

router.post('/v1/mediators/register', authMiddleware(), validate(registerSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mediator = await registerAsMediator(req.user!.id, req.body);
    res.status(201).json(mediator);
  } catch (error) {
    next(error);
  }
});

router.get('/v1/mediators/me', authMiddleware(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mediator = await getMyMediatorProfile(req.user!.id);
    res.json(mediator);
  } catch (error) {
    next(error);
  }
});

router.patch('/v1/mediators/me', authMiddleware(), validate(updateSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mediator = await updateMediator(req.user!.id, req.body);
    res.json(mediator);
  } catch (error) {
    next(error);
  }
});

router.get('/v1/mediators', validate(searchQuerySchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { specialties, region, minRating, limit, offset } = req.query as any;
    const result = await searchMediators({
      specialties: specialties ? (specialties as string).split(',') : undefined,
      region: region as string,
      minRating: minRating ? Number(minRating) : undefined,
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/v1/mediators/:mediatorId', validate(mediatorIdParam), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mediator = await getMediator(req.params.mediatorId);
    res.json(mediator);
  } catch (error) {
    next(error);
  }
});

router.post('/v1/disputes/:disputeId/partnership', authMiddleware(), validate(createPartnershipSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const partnership = await createPartnership(req.params.disputeId, req.body.mediatorId, req.user!.id);
    res.status(201).json(partnership);
  } catch (error) {
    next(error);
  }
});

router.get('/v1/disputes/:disputeId/partnerships', authMiddleware(), validate(disputeIdParam), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const partnerships = await getPartnershipsForDispute(req.params.disputeId, req.user!.id);
    res.json(partnerships);
  } catch (error) {
    next(error);
  }
});

export { router as mediatorRouter };
