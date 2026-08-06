import { Router, Response, NextFunction } from 'express';
import { getEnv } from '../../config/env';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { BadRequestError } from '../../utils/errors';
import { handlePaymentSucceeded, handlePaymentFailed, handlePaymentCanceled } from '../../services/payments';

const env = getEnv();
const router: Router = Router();

router.post('/stripe-test', async (req: Response, res: Response, next: NextFunction) => {
  try {
    if (env.NODE_ENV === 'production') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Debug endpoints are not available in production' } });
    }

    const { disputeId, paymentIntentId, eventType } = req.body || {};
    
    if (!disputeId || !paymentIntentId || !eventType) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing required fields: disputeId, paymentIntentId, eventType' } });
    }

    const validEventTypes = ['payment_intent.succeeded', 'payment_intent.payment_failed', 'payment_intent.canceled'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` } });
    }

    const idempotencyKey = `webhook:idempotent:${paymentIntentId}`;
    const alreadyProcessed = await redis.get(idempotencyKey);
    if (alreadyProcessed) {
      logger.info('Duplicate webhook test skipped', { paymentIntentId });
      return res.json({ received: true, message: 'Already processed' });
    }
    await redis.setex(idempotencyKey, 86400, '1');

    switch (eventType) {
      case 'payment_intent.succeeded': {
        await handlePaymentSucceeded(paymentIntentId);
        break;
      }
      case 'payment_intent.payment_failed': {
        await handlePaymentFailed(paymentIntentId);
        break;
      }
      case 'payment_intent.canceled': {
        await handlePaymentCanceled(paymentIntentId);
        break;
      }
      default:
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Unhandled event type: ${eventType}` } });
    }

    logger.info('Stripe webhook test simulated', { eventType, paymentIntentId, disputeId });
    res.json({ received: true, eventType, paymentIntentId, disputeId });
  } catch (error) {
    next(error);
  }
});

router.get('/otp/:email', async (req: Response, res: Response, next: NextFunction) => {
  try {
    if (env.NODE_ENV === 'production') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Debug endpoints are not available in production' } });
    }

    const { email } = req.params;
    const key = `debug:otp:${email}`;
    const data = await redis.get(key);
    
    if (!data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No OTP found for this email' } });
    }

    res.json(JSON.parse(data));
  } catch (error) {
    next(error);
  }
});

export { router as debugRouter };
