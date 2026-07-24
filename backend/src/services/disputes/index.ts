import { Prisma, DisputeState, DisputeCategory, PricingTier } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors';

export interface CreateDisputeInput {
  category: DisputeCategory;
  title: string;
  summary?: string;
  estimatedStakesUsd?: number;
  pricingTier?: PricingTier;
}

export interface UpdateDisputeInput {
  title?: string;
  summary?: string;
  estimatedStakesUsd?: number;
}

export interface DisputeWithDetails {
  id: string;
  category: DisputeCategory;
  title: string;
  summary: string | null;
  estimatedStakesUsd: any;
  state: DisputeState;
  stateChangedAt: Date;
  pricingTier: PricingTier;
  priceUsd: any;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  parties: any[];
  briefs: any[];
  evaluatorOutputs: any[];
  opinions: any[];
  payments: any[];
  documents: any[];
  briefPrepSessions: any[];
}

export function getDefaultPriceForTier(tier: PricingTier): number {
  const prices: Record<PricingTier, number> = {
    STANDARD: 49,
    EXPEDITED: 99,
    EXTENDED: 199,
    REANALYSIS: 49,
  };
  return prices[tier];
}

export function validateDisputeStateTransition(current: DisputeState, next: DisputeState): boolean {
  const allowed: Record<DisputeState, DisputeState[]> = {
    DRAFT: ['BRIEF_SUBMITTED', 'WITHDRAWN'],
    BRIEF_SUBMITTED: ['PAYMENT_PENDING', 'DRAFT', 'WITHDRAWN'],
    PAYMENT_PENDING: ['UNDER_ANALYSIS', 'DRAFT', 'FAILED', 'WITHDRAWN'],
    UNDER_ANALYSIS: ['AWAITING_AGGREGATION', 'FAILED', 'WITHDRAWN'],
    AWAITING_AGGREGATION: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    WITHDRAWN: [],
    FAILED: [],
    DECLINED: [],
    AWAITING_COUNTERPARTY: [],
    IN_PROGRESS: [],
    AWAITING_BRIEFS: [],
    AWAITING_COUNTERPARTY_BRIEF: [],
  };

  return allowed[current]?.includes(next) ?? false;
}

export async function createDispute(userId: string, input: CreateDisputeInput): Promise<DisputeWithDetails> {
  if (input.title.length < 5 || input.title.length > 200) {
    throw new ValidationError('Title must be between 5 and 200 characters');
  }

  if (input.summary && input.summary.length > 500) {
    throw new ValidationError('Summary must be 500 characters or less');
  }

  if (input.estimatedStakesUsd !== undefined && input.estimatedStakesUsd < 0) {
    throw new ValidationError('Estimated stakes must be a positive number');
  }

  const category = input.category;
  const title = input.title.trim();
  const summary = input.summary?.trim();
  const pricingTier = input.pricingTier || 'STANDARD';
  const priceUsd = getDefaultPriceForTier(pricingTier);

  const dispute = await prisma.dispute.create({
    data: {
      category,
      title,
      summary,
      estimatedStakesUsd: input.estimatedStakesUsd ? new Prisma.Decimal(input.estimatedStakesUsd) : null,
      pricingTier,
      priceUsd: new Prisma.Decimal(priceUsd),
      state: 'DRAFT',
      initiatorUserId: userId,
      parties: {
        create: {
          role: 'INITIATOR',
          userId,
          briefStatus: 'NOT_STARTED',
        },
      },
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
      parties: true,
      briefs: true,
      evaluatorOutputs: true,
      opinions: true,
      payments: true,
      documents: true,
      briefPrepSessions: true,
    },
  });

  logger.info('Dispute created', { disputeId: dispute.id, userId });

  return dispute as unknown as DisputeWithDetails;
}

export async function getDisputes(userId: string, options?: {
  state?: DisputeState;
  category?: DisputeCategory;
  limit?: number;
  cursor?: string;
}): Promise<{ data: DisputeWithDetails[]; nextCursor?: string; hasMore: boolean }> {
  const limit = Math.min(options?.limit || 20, 100);
  const cursor = options?.cursor;
  const where: any = {
    initiatorUserId: userId,
    deletedAt: null,
    ...(options?.state && { state: options.state }),
    ...(options?.category && { category: options.category }),
  };

  const disputes = await prisma.dispute.findMany({
    where,
    take: limit + 1,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      parties: true,
      briefs: true,
      evaluatorOutputs: true,
      opinions: true,
      payments: true,
      documents: true,
      briefPrepSessions: true,
    },
  });

  let nextCursor: string | undefined;
  let hasMore = false;

  if (disputes.length > limit) {
    hasMore = true;
    disputes.pop();
    nextCursor = disputes[disputes.length - 1]?.id;
  }

  return {
    data: disputes as unknown as DisputeWithDetails[],
    nextCursor,
    hasMore,
  };
}

export async function getDispute(userId: string, disputeId: string): Promise<DisputeWithDetails> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
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

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  return dispute as unknown as DisputeWithDetails;
}

export async function updateDispute(userId: string, disputeId: string, input: UpdateDisputeInput): Promise<DisputeWithDetails> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'DRAFT') {
    throw new ConflictError('Dispute can only be updated in draft state');
  }

  const data: any = {};

  if (input.title !== undefined) {
    if (input.title.length < 5 || input.title.length > 200) {
      throw new ValidationError('Title must be between 5 and 200 characters');
    }
    data.title = input.title.trim();
  }

  if (input.summary !== undefined) {
    if (input.summary.length > 500) {
      throw new ValidationError('Summary must be 500 characters or less');
    }
    data.summary = input.summary?.trim();
  }

  if (input.estimatedStakesUsd !== undefined) {
    if (input.estimatedStakesUsd < 0) {
      throw new ValidationError('Estimated stakes must be a positive number');
    }
    data.estimatedStakesUsd = new Prisma.Decimal(input.estimatedStakesUsd);
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data,
    include: {
      initiator: {
        select: {
          id: true,
          email: true,
          displayName: true,
          emailVerified: true,
        },
      },
      parties: true,
      briefs: true,
      evaluatorOutputs: true,
      opinions: true,
      payments: true,
      documents: true,
      briefPrepSessions: true,
    },
  });

  logger.info('Dispute updated', { disputeId, userId });

  return updated as unknown as DisputeWithDetails;
}

export async function withdrawDispute(userId: string, disputeId: string): Promise<DisputeWithDetails> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      payments: true,
    },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  if (!validateDisputeStateTransition(dispute.state, 'WITHDRAWN')) {
    throw new ConflictError(`Cannot withdraw dispute in state: ${dispute.state}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'WITHDRAWN',
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
        parties: true,
        briefs: true,
        evaluatorOutputs: true,
        opinions: true,
        payments: true,
        documents: true,
        briefPrepSessions: true,
      },
    });

    if (dispute.payments.length > 0) {
      const successfulPayment = dispute.payments.find(p => p.status === 'SUCCEEDED');
      if (successfulPayment) {
        await tx.payment.update({
          where: { id: successfulPayment.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
            refundedAmountUsd: successfulPayment.amountUsd,
            refundReason: 'Dispute withdrawn',
          },
        });
      }
    }

    return result;
  });

  logger.info('Dispute withdrawn', { disputeId, userId });

  return updated as unknown as DisputeWithDetails;
}
