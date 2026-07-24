import Stripe from 'stripe';
import { DisputeState, PaymentStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

const env = getEnv();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const PAYMENT_AMOUNT_USD = 49;
const PAYMENT_CURRENCY = 'usd';
const IDEMPOTENCY_TTL = 24 * 60 * 60;

function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  return stripe;
}

export async function createPaymentIntent(disputeId: string, userId: string): Promise<{ clientSecret: string }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { payments: true, parties: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'PAYMENT_PENDING') {
    throw new ConflictError(`Cannot create payment for dispute in state: ${dispute.state}`);
  }

  const existingIntent = dispute.payments.find(p => p.status === 'PENDING');
  if (existingIntent) {
    throw new ConflictError('Dispute already has a pending payment intent');
  }

  const idempotencyKey = `payment_intent:${disputeId}:${userId}`;
  const existingIdempotency = await redis.get(idempotencyKey);
  if (existingIdempotency) {
    const existing = await prisma.payment.findFirst({
      where: { idempotencyKey },
    });
    if (existing) {
      logger.info('Returning existing payment intent', { disputeId, userId });
      return { clientSecret: existing.processorPaymentId };
    }
  }

  const stripeInstance = getStripe();
  const paymentIntent = await stripeInstance.paymentIntents.create({
    amount: PAYMENT_AMOUNT_USD * 100,
    currency: PAYMENT_CURRENCY,
    metadata: {
      disputeId,
      userId,
    },
    description: `MeritView dispute analysis: ${dispute.title.substring(0, 100)}`,
  });

  await redis.set(idempotencyKey, paymentIntent.id, 'EX', IDEMPOTENCY_TTL);

  await prisma.payment.create({
    data: {
      disputeId,
      userId,
      amountUsd: PAYMENT_AMOUNT_USD,
      currency: 'USD',
      processor: 'stripe',
      processorPaymentId: paymentIntent.id,
      status: 'PENDING',
      idempotencyKey,
    },
  });

  logger.info('Payment intent created', { disputeId, userId, paymentIntentId: paymentIntent.id });

  return { clientSecret: paymentIntent.client_secret as string };
}

export async function confirmPayment(disputeId: string, userId: string, paymentIntentId: string): Promise<any> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { payments: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  const payment = dispute.payments.find(p => p.processorPaymentId === paymentIntentId);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status !== 'PENDING') {
    throw new ConflictError('Payment is not in pending state');
  }

  const stripeInstance = getStripe();
  const intent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

  if (intent.status !== 'succeeded') {
    throw new ValidationError(`Payment has not succeeded, status: ${intent.status}`);
  }

  const chargesData = (intent as any).charges;
  const chargeId = typeof chargesData?.data?.[0]?.id === 'string' ? chargesData.data[0].id : null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        processorChargeId: chargeId,
        completedAt: new Date(),
      },
    });

    const updatedDispute = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'UNDER_ANALYSIS',
        stateChangedAt: new Date(),
      },
      include: {
        initiator: {
          select: {
            id: true,
            email: true,
            displayName: true,
            emailVerified: true,
          },
        },
        parties: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
        briefs: true,
        evaluatorOutputs: true,
        opinions: true,
        payments: true,
        documents: true,
        briefPrepSessions: true,
      },
    });

    return { payment: updatedPayment, dispute: updatedDispute };
  });

  logger.info('Payment confirmed', { disputeId, userId, paymentIntentId });

  const { sendPaymentSuccessEmail } = await import('../email');
  if (result.dispute.initiator?.email) {
    await sendPaymentSuccessEmail(
      result.dispute.initiator.email,
      result.dispute.title,
      Number(result.dispute.priceUsd)
    );
  }

  return result.dispute;
}

export async function requestRefund(disputeId: string, userId: string): Promise<{ message: string }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { payments: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  const succeededPayment = dispute.payments.find(p => p.status === 'SUCCEEDED');
  if (!succeededPayment) {
    throw new ValidationError('No succeeded payment found for this dispute');
  }

  const stripeInstance = getStripe();
  try {
    await stripeInstance.refunds.create({
      payment_intent: succeededPayment.processorPaymentId,
      reason: 'requested_by_customer',
    });
  } catch (error) {
    logger.error('Stripe refund failed', error as Error, { disputeId, paymentId: succeededPayment.id });
    throw new ValidationError('Refund processing failed, please contact support');
  }

  await prisma.payment.update({
    where: { id: succeededPayment.id },
    data: {
      status: 'REFUNDED',
      refundedAmountUsd: succeededPayment.amountUsd,
      refundReason: 'Customer requested refund',
      refundedAt: new Date(),
    },
  });

  logger.info('Refund processed', { disputeId, userId, paymentId: succeededPayment.id });

  return { message: 'Refund request submitted and processed' };
}

export async function getPaymentHistory(userId: string): Promise<any[]> {
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      dispute: {
        select: {
          id: true,
          title: true,
          state: true,
        },
      },
    },
  });

  return payments;
}

export async function handleStripeWebhook(rawBody: string, signature: string): Promise<{ received: boolean }> {
  const stripeInstance = getStripe();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  let event: Stripe.Event;
  try {
    event = stripeInstance.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', error as Error);
    throw new ValidationError('Invalid webhook signature');
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const disputeId = paymentIntent.metadata?.disputeId;
      const userId = paymentIntent.metadata?.userId;

      if (disputeId && userId) {
        const existingPayment = await prisma.payment.findFirst({
          where: { processorPaymentId: paymentIntent.id },
        });

        if (existingPayment && existingPayment.status === 'PENDING') {
          await confirmPayment(disputeId, userId, paymentIntent.id);
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const existingPayment = await prisma.payment.findFirst({
        where: { processorPaymentId: paymentIntent.id },
      });

      if (existingPayment && existingPayment.status === 'PENDING') {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
          },
        });

        const dispute = await prisma.dispute.findUnique({
          where: { id: existingPayment.disputeId },
          include: {
            initiator: { select: { id: true, email: true } },
          },
        });

        if (dispute?.initiator?.email) {
          const { sendPaymentFailedEmail } = await import('../email');
          await sendPaymentFailedEmail(
            dispute.initiator.email,
            dispute.title,
            dispute.id
          );
        }

        logger.info('Payment marked as failed via webhook', {
          paymentId: existingPayment.id,
          disputeId: existingPayment.disputeId,
        });
      }
      break;
    }
    default:
      logger.debug('Unhandled webhook event type', { type: event.type });
  }

  return { received: true };
}
