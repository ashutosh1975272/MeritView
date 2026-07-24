import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  declineInvitation,
} from '../../services/invitations';
import { logger } from '../../utils/logger';

const router = Router() as ReturnType<typeof Router>;

const createInviteSchema = z.object({
  body: z.object({
    disputeId: z.string().uuid(),
    respondentEmail: z.string().email(),
  }),
});

const tokenParamSchema = z.object({
  params: z.object({
    token: z.string().min(1),
  }),
});

router.post(
  '/invitations',
  authMiddleware(),
  authRateLimiter,
  validate(createInviteSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await createInvitation(
        req.body.disputeId,
        req.user!.id,
        req.body.respondentEmail
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/invitations/:token',
  authRateLimiter,
  validate(tokenParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationByToken(req.params.token);
      res.json(invitation);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/invitations/:token/accept',
  authMiddleware(),
  authRateLimiter,
  validate(tokenParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await acceptInvitation(req.params.token, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/invitations/:token/decline',
  authRateLimiter,
  validate(tokenParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await declineInvitation(req.params.token);
      res.json({ status: 'declined' });
    } catch (error) {
      next(error);
    }
  }
);

export { router as invitationsRouter };
