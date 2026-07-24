import { DisputeState, DisputeCategory } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { createOpinionFromAggregation, OpinionContentData } from '../opinions';
import { AGG_PROMPT_VERSION } from '../../prompts/agg-v2.1';

const MIN_EVALUATOR_OUTPUTS = 3;

export async function getPendingAggregations(): Promise<any[]> {
  const disputes = await prisma.dispute.findMany({
    where: {
      state: 'AWAITING_AGGREGATION',
      deletedAt: null,
    },
    include: {
      evaluatorOutputs: {
        where: { parseSuccess: true },
      },
      initiator: {
        select: {
          id: true,
          email: true,
          displayName: true,
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
      opinions: true,
    },
    orderBy: { stateChangedAt: 'asc' },
  });

  return disputes.map(dispute => ({
    id: dispute.id,
    title: dispute.title,
    category: dispute.category,
    state: dispute.state,
    stateChangedAt: dispute.stateChangedAt,
    evaluatorOutputCount: dispute.evaluatorOutputs.length,
    successfulEvaluatorOutputs: dispute.evaluatorOutputs.filter(e => e.parseSuccess).length,
    initiator: dispute.initiator,
    parties: dispute.parties,
    createdAt: dispute.createdAt,
  }));
}

export async function publishOpinion(
  adminUserId: string,
  disputeId: string,
  data: {
    content: OpinionContentData;
    interEvaluatorAgreement: number;
    overallConfidence: number;
    aggregatorProvider: string;
    aggregatorModelId: string;
    totalCostUsd: number;
  }
): Promise<any> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      evaluatorOutputs: {
        where: { parseSuccess: true },
      },
      opinions: true,
    },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'AWAITING_AGGREGATION') {
    throw new ValidationError(`Cannot publish opinion for dispute in state: ${dispute.state}`);
  }

  const successfulOutputs = dispute.evaluatorOutputs.filter(e => e.parseSuccess);

  if (successfulOutputs.length < MIN_EVALUATOR_OUTPUTS) {
    throw new ValidationError(
      `Need at least ${MIN_EVALUATOR_OUTPUTS} successful evaluator outputs, got ${successfulOutputs.length}`
    );
  }

  if (dispute.opinions) {
    throw new ValidationError('Opinion already exists for this dispute');
  }

  const evaluatorOutputIds = successfulOutputs.map(e => e.id);
  const totalCost = successfulOutputs.reduce((sum, e) => sum + Number(e.costUsd), 0);

  const opinion = await createOpinionFromAggregation(disputeId, {
    content: data.content,
    evalPromptVersion: successfulOutputs[0]?.promptVersion || 'unknown',
    aggPromptVersion: AGG_PROMPT_VERSION,
    evaluatorOutputIds,
    interEvaluatorAgreement: data.interEvaluatorAgreement,
    overallConfidence: data.overallConfidence,
    aggregatorProvider: data.aggregatorProvider,
    aggregatorModelId: data.aggregatorModelId,
    totalCostUsd: data.totalCostUsd || totalCost,
  });

  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      state: 'COMPLETED',
      stateChangedAt: new Date(),
      completedAt: new Date(),
    },
  });

  logger.info('Opinion published by admin', {
    disputeId,
    adminUserId,
    evaluatorOutputsUsed: evaluatorOutputIds.length,
    totalCostUsd: data.totalCostUsd,
  });

  return opinion;
}

export async function getAdminDisputes(filters: {
  state?: DisputeState;
  category?: DisputeCategory;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ data: any[]; nextCursor?: string; hasMore: boolean }> {
  const limit = Math.min(filters?.limit || 20, 100);
  const cursor = filters?.cursor;

  const where: any = {
    deletedAt: null,
  };

  if (filters?.state) {
    where.state = filters.state;
  }

  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  const disputes = await prisma.dispute.findMany({
    where,
    take: limit + 1,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      initiator: {
        select: {
          id: true,
          email: true,
          displayName: true,
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
      _count: {
        select: {
          evaluatorOutputs: true,
          briefs: true,
          payments: true,
        },
      },
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
    data: disputes,
    nextCursor,
    hasMore,
  };
}

export async function getAdminDisputeDetail(disputeId: string): Promise<any> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      initiator: {
        select: {
          id: true,
          email: true,
          displayName: true,
          emailVerified: true,
          createdAt: true,
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
      evaluatorOutputs: {
        orderBy: { createdAt: 'desc' },
      },
      opinions: true,
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      documents: true,
      briefPrepSessions: true,
    },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  return dispute;
}
