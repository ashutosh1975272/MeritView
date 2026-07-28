import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPaymentIntent, confirmPayment, requestRefund, getUserPayments } from '../../services/payments';
import { logger } from '../../utils/logger';

const router: Router = Router();

const disputeIdParams = z.object({
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

const confirmPaymentSchema = z.object({
  body: z.object({ paymentIntentId: z.string().min(1) }),
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

const refundRequestSchema = z.object({
  body: z.object({ reason: z.string().min(1).max(1000) }),
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

router.get('/disputes/:disputeId/payment-intent',
  authMiddleware(),
  validate(disputeIdParams),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const paymentIntent = await createPaymentIntent(req.params.disputeId, req.user!.id);
      res.json({
        payment_intent: {
          client_secret: paymentIntent.client_secret,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/disputes/:disputeId/payment/confirm',
  authMiddleware(),
  validate(confirmPaymentSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await confirmPayment(req.params.disputeId, req.user!.id, req.body.paymentIntentId);
      logger.info('Payment confirmed by user', { userId: req.user!.id, disputeId: req.params.disputeId });
      res.json({
        payment_intent: result.payment,
        dispute: result.dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/disputes/:disputeId/refund-request',
  authMiddleware(),
  validate(refundRequestSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await requestRefund(req.params.disputeId, req.user!.id, req.body.reason.trim());
      logger.info('Refund requested by user', { userId: req.user!.id, disputeId: req.params.disputeId });
      res.status(202).json({
        message: 'Refund processed successfully',
        payment_intent: result.payment,
        dispute: result.dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/users/me/payments',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payments = await getUserPayments(req.user!.id);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  }
);

export { router as paymentRouter };
