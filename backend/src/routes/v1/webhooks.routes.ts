import { Router, Request, Response, NextFunction } from 'express';
import { getEnv } from '../../config/env';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { BadRequestError } from '../../utils/errors';
import { handlePaymentSucceeded, handlePaymentFailed, handlePaymentCanceled } from '../../services/payments';
import Stripe from 'stripe';

const env = getEnv();
const router: Router = Router();

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

router.post('/stripe',
  expressRawBody(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      if (!sig) {
        throw new BadRequestError('Missing stripe-signature header');
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        logger.warn('Stripe webhook signature verification failed', { error: err.message });
        res.status(400).json({ error: { code: 'WEBHOOK_SIGNATURE_INVALID', message: 'Invalid signature' } });
        return;
      }

      logger.info('Stripe webhook received', { type: event.type, id: event.id });

      const idempotencyKey = `webhook:idempotent:${event.id}`;
      const alreadyProcessed = await redis.get(idempotencyKey);
      if (alreadyProcessed) {
        logger.info('Duplicate webhook skipped', { eventId: event.id });
        res.json({ received: true });
        return;
      }
      await redis.setex(idempotencyKey, 86400, '1');

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentSucceeded(paymentIntent.id);
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailed(paymentIntent.id);
          break;
        }
        case 'payment_intent.canceled': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentCanceled(paymentIntent.id);
          break;
        }
        default:
          logger.debug('Unhandled webhook event type', { type: event.type });
      }

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

function expressRawBody() {
  return (req: Request, _res: Response, next: NextFunction) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      data += chunk;
    });
    req.on('end', () => {
      req.body = data;
      next();
    });
  };
}

export { router as webhookRouter };
