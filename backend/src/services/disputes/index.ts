import { prisma } from '../../db/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError, InternalError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { validateTransition } from './state-machine';
import { DisputeState, PricingTier, Prisma } from '@prisma/client';
import { addEmailJob } from '../../jobs/queues';
import { getEnv } from '../../config/env';
import Stripe from 'stripe';
import { generateId } from '../../utils/id';
import { createInvitation as invitationsCreateInvitation } from '../invitations';

const env = getEnv();

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  timeout: 10000,
});

const PRICING_TIERS: Record<string, { price: number; label: string }> = {
  STANDARD: { price: env.PRICE_STANDARD, label: 'Standard' },
  EXPEDITED: { price: env.PRICE_EXPEDITED, label: 'Expedited' },
  EXTENDED: { price: env.PRICE_EXTENDED, label: 'Extended' },
  REANALYSIS: { price: env.PRICE_REANALYSIS, label: 'Re-analysis' },
};

export async function createDispute(
  data: {
    category: string;
    title: string;
    summary?: string;
    estimatedStakesUsd?: number;
    pricingTier?: string;
    counterparty?: { email: string; display_name_for_invitation: string };
  },
  userId: string
) {
  const normalizedCategory = data.category.toUpperCase().replace(/-/g, '_');

  const validCategories = ['CONTRACT_INTERPRETATION', 'SMALL_CLAIMS_ASSESSMENT', 'PARTNERSHIP_CONFLICT'];
  if (!validCategories.includes(normalizedCategory)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  const pricingTier = (data.pricingTier || 'STANDARD').toUpperCase().replace(/-/g, '_');
  const validTiers = ['STANDARD', 'EXPEDITED', 'EXTENDED', 'REANALYSIS'];
  if (!validTiers.includes(pricingTier)) {
    throw new BadRequestError(`Invalid pricing tier. Must be one of: ${validTiers.join(', ')}`);
  }

  const tierConfig = PRICING_TIERS[pricingTier];

  if (data.title.length < 5 || data.title.length > 200) {
    throw new BadRequestError('Title must be between 5 and 200 characters');
  }

  if (data.summary && data.summary.length > 5000) {
    throw new BadRequestError('Summary must not exceed 5000 characters');
  }

  if (data.estimatedStakesUsd !== undefined && data.estimatedStakesUsd <= 0) {
    throw new BadRequestError('Estimated stakes must be a positive number');
  }

  const disputeId = generateId('disp');
  const partyId = generateId('party');

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        id: disputeId,
        category: normalizedCategory as any,
        title: data.title,
        summary: data.summary || null,
        estimatedStakesUsd: data.estimatedStakesUsd ?? null,
        priceUsd: tierConfig.price,
        pricingTier: pricingTier as PricingTier,
        state: 'DRAFT',
        initiatorUserId: userId,
        parties: {
          create: {
            id: partyId,
            role: 'INITIATOR',
            userId: userId,
            briefStatus: 'NOT_STARTED',
          },
        },
      },
      include: {
        parties: true,
      },
    });

    return d;
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    await addEmailJob('dispute-created', user.email, { disputeId: dispute.id, title: dispute.title });
  }

  let paymentIntent: { id: string; clientSecret: string } | null = null;
  if (env.STRIPE_SECRET_KEY) {
    try {
      const amountCents = Math.round(tierConfig.price * 100);
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        metadata: { disputeId: dispute.id, userId },
        description: `MeritView: ${dispute.title.substring(0, 100)}`,
        automatic_payment_methods: { enabled: true },
      });
      paymentIntent = { id: pi.id, clientSecret: pi.client_secret || '' };
    } catch (err) {
      logger.warn('Failed to create payment intent for new dispute', {
        disputeId: dispute.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let invitationUrl: string | undefined;
  let invitationExpiresAt: string | undefined;

  if (data.counterparty) {
    try {
      await invitationsCreateInvitation(dispute.id, data.counterparty.email, userId);
      const party = await prisma.party.findFirst({
        where: { disputeId: dispute.id, role: 'RESPONDENT' },
        select: { invitationToken: true, invitationExpiresAt: true },
      });
      if (party?.invitationToken) {
        invitationUrl = `${env.NEXT_PUBLIC_APP_URL}/invitations/${party.invitationToken}`;
        invitationExpiresAt = party.invitationExpiresAt?.toISOString();
      }
    } catch (err) {
      logger.warn('Failed to create invitation for counterparty', {
        disputeId: dispute.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Dispute created', { disputeId: dispute.id, userId, hasPaymentIntent: !!paymentIntent });

  return { dispute, paymentIntent, invitation_url: invitationUrl, invitation_expires_at: invitationExpiresAt };
}

export async function getDisputes(
  userId: string,
  options?: { cursor?: string; limit?: number; state?: string; role?: string; category?: string }
) {
  const limit = options?.limit || 20;
  const where: any = {
    deletedAt: null,
  };

  if (options?.role === 'initiator') {
    where.initiatorUserId = userId;
  } else if (options?.role === 'respondent') {
    where.parties = { some: { userId, role: 'RESPONDENT' } };
  } else {
    where.OR = [
      { initiatorUserId: userId },
      { parties: { some: { userId } } },
    ];
  }

  if (options?.state) {
    where.state = options.state;
  }

  if (options?.category) {
    where.category = options.category.toUpperCase().replace(/-/g, '_');
  }

  if (options?.cursor) {
    const cursorDispute = await prisma.dispute.findUnique({
      where: { id: options.cursor },
      select: { createdAt: true },
    });
    if (cursorDispute) {
      where.createdAt = { lt: cursorDispute.createdAt };
    }
  }

  const disputes = await prisma.dispute.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: { parties: true, payments: true },
  });

  const hasMore = disputes.length > limit;
  const data = hasMore ? disputes.slice(0, limit) : disputes;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}

export async function getDispute(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: disputeId,
      initiatorUserId: userId,
      deletedAt: null,
    },
    include: {
      parties: true,
      briefs: true,
      opinions: true,
      evaluatorOutputs: true,
      payments: true,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  return dispute;
}

export async function updateDispute(
  disputeId: string,
  userId: string,
  data: {
    title?: string;
    summary?: string;
    estimatedStakesUsd?: number;
  }
) {
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: disputeId,
      initiatorUserId: userId,
      deletedAt: null,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'DRAFT') {
    throw new ConflictError('Can only update disputes in DRAFT state');
  }

  if (data.title !== undefined && (data.title.length < 5 || data.title.length > 200)) {
    throw new BadRequestError('Title must be between 5 and 200 characters');
  }

  if (data.summary !== undefined && data.summary.length > 5000) {
    throw new BadRequestError('Summary must not exceed 5000 characters');
  }

  if (data.estimatedStakesUsd !== undefined && data.estimatedStakesUsd <= 0) {
    throw new BadRequestError('Estimated stakes must be a positive number');
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.estimatedStakesUsd !== undefined && { estimatedStakesUsd: data.estimatedStakesUsd }),
    },
    include: {
      parties: true,
    },
  });

  logger.info('Dispute updated', { disputeId, userId });

  return updated;
}

export async function withdrawDispute(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: disputeId,
      initiatorUserId: userId,
      deletedAt: null,
    },
    include: {
      payments: true,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const allowedWithdrawStates: DisputeState[] = ['DRAFT', 'AWAITING_BRIEFS', 'AWAITING_COUNTERPARTY', 'IN_PROGRESS', 'AWAITING_COUNTERPARTY_BRIEF'];
  if (!allowedWithdrawStates.includes(dispute.state)) {
    throw new ConflictError(
      `Cannot withdraw dispute in state ${dispute.state}. Allowed states: ${allowedWithdrawStates.join(', ')}`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const successfulPayment = dispute.payments.find(p => p.status === 'SUCCEEDED');

    if (successfulPayment) {
      await tx.payment.update({
        where: { id: successfulPayment.id },
        data: {
          status: 'REFUNDED',
          refundedAmountUsd: successfulPayment.amountUsd,
          refundReason: 'Dispute withdrawn by initiator',
          refundedAt: new Date(),
        },
      });

      logger.info('Payment refunded on dispute withdrawal', {
        disputeId,
        paymentId: successfulPayment.id,
        amountUsd: successfulPayment.amountUsd.toString(),
      });
    }

    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'WITHDRAWN',
        stateChangedAt: new Date(),
      },
      include: {
        parties: true,
        payments: true,
      },
    });

    return updated;
  });

  logger.info('Dispute withdrawn', { disputeId, userId });

  return result;
}

export async function verifyDisputeOwnership(disputeId: string, userId: string): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { initiatorUserId: true, deletedAt: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new ForbiddenError('You do not have access to this dispute');
  }
}

export async function verifyDisputeAccess(disputeId: string, userId: string): Promise<{ role: 'INITIATOR' | 'RESPONDENT' }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    select: { initiatorUserId: true, parties: { where: { userId }, select: { role: true } } },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId === userId) {
    return { role: 'INITIATOR' };
  }

  const party = dispute.parties[0];
  if (party) {
    return { role: party.role as 'INITIATOR' | 'RESPONDENT' };
  }

  throw new ForbiddenError('You do not have access to this dispute');
}

export async function getDisputesForParty(userId: string) {
  return prisma.dispute.findMany({
    where: {
      parties: { some: { userId, role: 'RESPONDENT' } },
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      parties: true,
      payments: true,
      initiator: { select: { id: true, email: true, displayName: true } },
    },
  });
}

export async function requestReanalysis(disputeId: string, userId: string): Promise<{ disputeId: string; state: string; message: string }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { id: true, state: true, initiatorUserId: true, deletedAt: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new ForbiddenError('You do not have access to this dispute');
  }

  if (dispute.state !== 'COMPLETED') {
    throw new BadRequestError('Only completed disputes can request reanalysis');
  }

  await prisma.dispute.update({
    where: { id: disputeId },
    data: { state: 'REANALYSIS_IN_PROGRESS', stateChangedAt: new Date() },
  });

  logger.info('Reanalysis requested', { disputeId, userId });

  return {
    disputeId,
    state: 'REANALYSIS_IN_PROGRESS',
    message: 'Reanalysis has been initiated',
  };
}
