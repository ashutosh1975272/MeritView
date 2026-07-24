import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireEmailVerified, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import {
  createPaymentIntent,
  confirmPayment,
  requestRefund,
  getPaymentHistory,
  handleStripeWebhook,
} from '../../services/payments';
import { logger } from '../../utils/logger';
import { ValidationError, ForbiddenError } from '../../utils/errors';

const router = Router() as ReturnType<typeof Router>;

const disputeParamSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

const confirmPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string().min(1),
  }),
  params: z.object({
    disputeId: z.string(),
  }),
});

router.get(
  '/disputes/:disputeId/payment-intent',
  authRateLimiter,
  authMiddleware(),
  requireEmailVerified,
  validate(disputeParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await createPaymentIntent(req.params.disputeId, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/disputes/:disputeId/payment/confirm',
  authRateLimiter,
  authMiddleware(),
  requireEmailVerified,
  validate(confirmPaymentSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dispute = await confirmPayment(req.params.disputeId, req.user!.id, req.body.paymentIntentId);
      res.json({ dispute });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/disputes/:disputeId/refund-request',
  authRateLimiter,
  authMiddleware(),
  validate(disputeParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await requestRefund(req.params.disputeId, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/users/me/payments',
  authRateLimiter,
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payments = await getPaymentHistory(req.user!.id);
      res.json({ payments });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/webhooks/stripe',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      if (!sig) {
        throw new ValidationError('Missing stripe-signature header');
      }
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await handleStripeWebhook(rawBody, sig);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

function getRouter(): Router {
  return router;
}

export { router as paymentsRouter };
