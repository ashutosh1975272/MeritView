import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRateLimiter } from '../../middleware/rateLimit';
import {
  createInvitation,
  acceptInvitation,
  declineInvitation,
  getInvitationStatus,
  getInvitationByToken,
  resendInvitation,
} from '../../services/invitations';
import { logger } from '../../utils/logger';

const router: Router = Router();

const inviteRateLimiter = createRateLimiter({
  windowMs: 3600000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:invite',
});

const createInviteSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const disputeIdParamSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const tokenParamSchema = z.object({
  params: z.object({
    token: z.string().min(1),
  }),
});

router.post(
  '/v1/disputes/:disputeId/invite',
  authMiddleware(),
  inviteRateLimiter,
  validate(createInviteSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const { email } = req.body;

      const result = await createInvitation(disputeId, email, req.user!.id);

      logger.info('Invitation sent via route', { disputeId, email, userId: req.user!.id });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/disputes/:disputeId/invitation',
  authMiddleware(),
  validate(disputeIdParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const status = await getInvitationStatus(disputeId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

const acceptInviteSchema = z.object({
  body: z.object({
    displayName: z.string().max(100).optional(),
    display_name: z.string().max(100).optional(),
    createAccount: z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      displayName: z.string().max(100).optional(),
      display_name: z.string().max(100).optional(),
    }).optional(),
    create_account: z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      displayName: z.string().max(100).optional(),
      display_name: z.string().max(100).optional(),
    }).optional(),
    acceptTerms: z.boolean().optional(),
    accept_terms: z.boolean().optional(),
  }).optional().transform((data) => {
    if (!data) return undefined;
    const acct = (data.createAccount ?? data.create_account) as { email: string; password: string; displayName?: string; display_name?: string } | undefined;
    return {
      displayName: data.displayName ?? data.display_name ?? undefined,
      createAccount: acct ? {
        email: acct.email,
        password: acct.password,
        displayName: acct.displayName ?? acct.display_name ?? undefined,
      } : undefined,
      acceptTerms: data.acceptTerms ?? data.accept_terms,
    };
  }),
  params: z.object({
    token: z.string().min(1),
  }),
});

router.post(
  '/v1/invitations/:token/accept',
  validate(acceptInviteSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const body = req.body;
      const result = await acceptInvitation(
        token,
        body?.displayName,
        body?.createAccount,
        body?.acceptTerms,
      );
      logger.info('Invitation accepted via route', { token: token.substring(0, 8) + '...' });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/invitations/:token',
  validate(tokenParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const result = await getInvitationByToken(token);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/v1/disputes/:disputeId/re-invite',
  authMiddleware(),
  inviteRateLimiter,
  validate(disputeIdParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const result = await resendInvitation(disputeId, req.user!.id);
      logger.info('Invitation resent via route', { disputeId, userId: req.user!.id });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/v1/invitations/:token/decline',
  validate(tokenParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const result = await declineInvitation(token);
      logger.info('Invitation declined via route', { token: token.substring(0, 8) + '...' });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export { router as invitationRouter };
