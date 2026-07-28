import { getEnv } from '../../config/env';
import { redis } from '../../config/redis';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { BadRequestError, NotFoundError, ConflictError, InternalError } from '../../utils/errors';
import Stripe from 'stripe';
import { addEmailJob } from '../../jobs/queues';
import { dispatchEvaluators } from '../evaluation/index';
import { generateId } from '../../utils/id';

const env = getEnv();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  timeout: 10000,
});

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

const TIER_AMOUNT_CENTS: Record<string, number> = {
  STANDARD: 4900,
  EXPEDITED: 9900,
  EXTENDED: 19900,
  REANALYSIS: 4900,
};

function getIdempotencyKey(disputeId: string, action: string): string {
  return `idempotency:payment:${disputeId}:${action}`;
}

export async function createPaymentIntent(disputeId: string, userId: string): Promise<Stripe.PaymentIntent> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { id: true, state: true, initiatorUserId: true, title: true, pricingTier: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'AWAITING_BRIEFS' && dispute.state !== 'PAYMENT_PENDING') {
    throw new BadRequestError('Dispute is not eligible for payment', {
      currentState: dispute.state,
      expectedState: 'PAYMENT_PENDING',
    });
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { disputeId, userId, status: { in: ['PENDING', 'SUCCEEDED'] } },
    orderBy: { createdAt: 'desc' },
  });

  if (existingPayment?.status === 'SUCCEEDED') {
    throw new ConflictError('Payment already completed for this dispute');
  }

  const amountCents = TIER_AMOUNT_CENTS[dispute.pricingTier as string] || TIER_AMOUNT_CENTS['STANDARD'];
  const amountUsd = amountCents / 100;

  const idempotencyKey = getIdempotencyKey(disputeId, 'create_intent');

  const existingIdempotent = await redis.get(idempotencyKey);
  if (existingIdempotent) {
    const paymentIntentId = existingIdempotent;
    const paymentRecord = await prisma.payment.findFirst({
      where: { processorPaymentId: paymentIntentId },
    });
    if (paymentRecord) {
      return stripe.paymentIntents.retrieve(paymentIntentId);
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      metadata: {
        disputeId,
        userId,
      },
      description: `MeritView analysis: ${dispute.title.substring(0, 100)}`,
    },
    {
      idempotencyKey,
    }
  );

  await redis.psetex(idempotencyKey, IDEMPOTENCY_TTL, paymentIntent.id);

  await prisma.payment.upsert({
    where: {
      processorPaymentId: paymentIntent.id,
    },
    update: {
      status: 'PENDING',
      amountUsd,
    },
    create: {
      id: generateId('pay'),
      disputeId,
      userId,
      amountUsd,
      currency: 'USD',
      processor: 'stripe',
      processorPaymentId: paymentIntent.id,
      status: 'PENDING',
      idempotencyKey,
    },
  });

  logger.info('Payment intent created', { disputeId, userId, paymentIntentId: paymentIntent.id });
  return paymentIntent;
}

export async function confirmPayment(
  disputeId: string,
  userId: string,
  paymentIntentId: string
): Promise<{ payment: any; dispute: any }> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new BadRequestError('Payment has not been completed', {
      paymentIntentStatus: paymentIntent.status,
    });
  }

  const payment = await prisma.payment.findFirst({
    where: { processorPaymentId: paymentIntentId },
  });

  if (!payment) {
    throw new NotFoundError('Payment record not found');
  }

  if (payment.status === 'SUCCEEDED') {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    return { payment, dispute };
  }

  const [partyCount, submittedBriefCount] = await Promise.all([
    prisma.party.count({ where: { disputeId } }),
    prisma.brief.count({ where: { disputeId, status: { in: ['SUBMITTED', 'SEALED'] } } }),
  ]);

  if (submittedBriefCount < partyCount) {
    throw new ConflictError('All parties must submit their briefs before payment can be confirmed', {
      parties: partyCount,
      briefsSubmitted: submittedBriefCount,
    });
  }

  const [updatedPayment, updatedDispute] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        processorChargeId: paymentIntent.latest_charge as string,
        completedAt: new Date(),
      },
    }),
    prisma.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'UNDER_ANALYSIS',
        stateChangedAt: new Date(),
      },
    }),
  ]);

  const idempotencyKey = getIdempotencyKey(disputeId, 'confirm');
  await redis.psetex(idempotencyKey, IDEMPOTENCY_TTL, paymentIntentId);

  const payingUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (payingUser) {
    await addEmailJob('payment-success', payingUser.email, { disputeId, amount: Number(updatedPayment.amountUsd) });
  }

  logger.info('Payment confirmed', { disputeId, userId, paymentIntentId });

  dispatchEvaluators(disputeId).catch((error) => {
    logger.error('Evaluation dispatch failed after payment confirmation', error instanceof Error ? error : undefined, {
      disputeId,
    });
  });

  return { payment: updatedPayment, dispute: updatedDispute };
}

export async function requestRefund(
  disputeId: string,
  userId: string,
  reason: string
): Promise<{ payment: any; dispute: any }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { id: true, state: true, initiatorUserId: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  const eligibleStates = ['UNDER_ANALYSIS', 'COMPLETED', 'WITHDRAWN'];
  if (!eligibleStates.includes(dispute.state)) {
    throw new BadRequestError('Dispute is not eligible for refund', {
      currentState: dispute.state,
      eligibleStates,
    });
  }

  const payment = await prisma.payment.findFirst({
    where: { disputeId, userId, status: 'SUCCEEDED' },
    orderBy: { createdAt: 'desc' },
  });

  if (!payment) {
    throw new BadRequestError('No successful payment found for this dispute');
  }

  if (payment.status === 'REFUNDED') {
    throw new ConflictError('Payment has already been refunded');
  }

  if (payment.processorChargeId) {
    try {
      await stripe.refunds.create({
        charge: payment.processorChargeId,
        reason: 'requested_by_customer',
        metadata: {
          disputeId,
          userId,
          reason,
        },
      });
    } catch (error: any) {
      logger.error('Stripe refund failed', error, { disputeId, userId });
      throw new InternalError('Failed to process refund. Please contact support.');
    }
  }

  const [updatedPayment, updatedDispute] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refundedAmountUsd: payment.amountUsd,
        refundReason: reason,
        refundedAt: new Date(),
      },
    }),
    prisma.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'WITHDRAWN',
        stateChangedAt: new Date(),
      },
    }),
  ]);

  logger.info('Payment refunded', { disputeId, userId, reason });

  return { payment: updatedPayment, dispute: updatedDispute };
}

export async function getUserPayments(userId: string): Promise<any[]> {
  const payments = await prisma.payment.findMany({
    where: { userId },
    include: {
      dispute: {
        select: {
          id: true,
          title: true,
          state: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments;
}

export async function handlePaymentSucceeded(paymentIntentId: string): Promise<void> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const { disputeId, userId } = paymentIntent.metadata;

  if (!disputeId || !userId) {
    logger.warn('Webhook: missing metadata on payment intent', { paymentIntentId });
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { processorPaymentId: paymentIntentId },
  });

  if (!payment) {
    logger.warn('Webhook: payment record not found', { paymentIntentId });
    return;
  }

  if (payment.status === 'SUCCEEDED') {
    return;
  }

  const [updatedPayment, updatedDispute] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        processorChargeId: paymentIntent.latest_charge as string,
        completedAt: new Date(),
      },
    }),
    prisma.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'UNDER_ANALYSIS',
        stateChangedAt: new Date(),
      },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    await addEmailJob('payment-success', user.email, { disputeId, amount: Number(updatedPayment.amountUsd) });
  }

  logger.info('Webhook: payment succeeded', { disputeId, userId, paymentIntentId });

  dispatchEvaluators(disputeId).catch((error) => {
    logger.error('Evaluation dispatch failed after webhook payment', error instanceof Error ? error : undefined, {
      disputeId,
    });
  });
}

export async function handlePaymentFailed(paymentIntentId: string): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { processorPaymentId: paymentIntentId },
  });

  if (!payment) {
    logger.warn('Webhook: payment record not found for failed intent', { paymentIntentId });
    return;
  }

  if (payment.status !== 'PENDING') {
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
    },
  });

  const idempotencyKey = getIdempotencyKey(payment.disputeId, 'create_intent');
  await redis.del(idempotencyKey);

  const user = await prisma.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
  if (user) {
    await addEmailJob('payment-failed', user.email, { disputeId: payment.disputeId, error: 'Payment was declined by the processor. Please try again.' });
  }

  logger.info('Webhook: payment failed, reverted', { disputeId: payment.disputeId, paymentIntentId });
}

export async function handlePaymentCanceled(paymentIntentId: string): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { processorPaymentId: paymentIntentId },
  });

  if (!payment) {
    logger.warn('Webhook: payment record not found for canceled intent', { paymentIntentId });
    return;
  }

  if (payment.status !== 'PENDING') {
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'CANCELED',
    },
  });

  const idempotencyKey = getIdempotencyKey(payment.disputeId, 'create_intent');
  await redis.del(idempotencyKey);

  logger.info('Webhook: payment canceled', { disputeId: payment.disputeId, paymentIntentId });
}
