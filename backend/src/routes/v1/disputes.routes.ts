import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireEmailVerified, AuthenticatedRequest } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createRateLimiter } from '../../middleware/rateLimit';
import { logger } from '../../utils/logger';
import { createDispute, getDisputes, getDispute, updateDispute, withdrawDispute, requestReanalysis, verifyDisputeAccess, getDisputesForParty } from '../../services/disputes';

const router: Router = Router();

const disputeRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  keyPrefix: 'ratelimit:disputes',
});

const createDisputeSchema = z.object({
  body: z.object({
    category: z.enum(['contract_interpretation', 'small_claims_assessment', 'partnership_conflict']),
    title: z.string().min(5).max(200),
    summary: z.string().max(5000).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
    pricingTier: z.enum(['standard', 'expedited', 'extended', 'reanalysis']).optional(),
    counterparty: z.object({
      email: z.string().email(),
      display_name_for_invitation: z.string().max(100),
    }).optional(),
  }),
});

const updateDisputeSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    summary: z.string().max(5000).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
  }),
});

const disputeIdParamsSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const listDisputesQuerySchema = z.object({
  cursor: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.string().optional(),
  role: z.enum(['initiator', 'respondent']).optional(),
  category: z.string().optional(),
});

router.post(
  '/',
  authMiddleware(),
  requireEmailVerified,
  disputeRateLimiter,
  validate(createDisputeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      logger.info('Received create dispute request', { body: req.body, userId: req.user!.id });
      const { dispute, paymentIntent, invitation_url, invitation_expires_at } = await createDispute(req.body, req.user!.id);
      logger.info('Dispute created successfully', { disputeId: dispute.id, userId: req.user!.id });
      res.status(201).json({ dispute, paymentIntent, invitation_url, invitation_expires_at });
    } catch (error) {
      logger.error('Error creating dispute', error as Error, { body: req.body, userId: req.user!.id });
      next(error);
    }
  }
);

router.get(
  '/',
  authMiddleware(),
  validateQuery(listDisputesQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit, state, role, category } = req.query as unknown as z.infer<typeof listDisputesQuerySchema>;
      const result = await getDisputes(req.user!.id, { cursor, limit, state, role, category });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:disputeId',
  authMiddleware(),
  validate(disputeIdParamsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await getDispute(req.params.disputeId, req.user!.id);
      res.json(dispute);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:disputeId',
  authMiddleware(),
  validate(disputeIdParamsSchema),
  validate(updateDisputeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await updateDispute(req.params.disputeId, req.user!.id, req.body);
      logger.info('Dispute updated via route', { disputeId: req.params.disputeId, userId: req.user!.id });
      res.json(dispute);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:disputeId/withdraw',
  authMiddleware(),
  validate(disputeIdParamsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await withdrawDispute(req.params.disputeId, req.user!.id);
      logger.info('Dispute withdrawn via route', { disputeId: req.params.disputeId, userId: req.user!.id });
      res.json(dispute);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:disputeId/reanalysis',
  authMiddleware(),
  validate(disputeIdParamsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await requestReanalysis(req.params.disputeId, req.user!.id);
      logger.info('Reanalysis requested', { disputeId: req.params.disputeId, userId: req.user!.id });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/respondent',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const disputes = await getDisputesForParty(req.user!.id);
      res.json(disputes);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/respondent/:disputeId',
  authMiddleware(),
  validate(disputeIdParamsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { role } = await verifyDisputeAccess(req.params.disputeId, req.user!.id);
      const dispute = await getDispute(req.params.disputeId, req.user!.id);
      res.json({ role, dispute });
    } catch (error) {
      next(error);
    }
  }
);

export { router as disputeRouter };
