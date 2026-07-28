import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { encrypt } from '../../utils/crypto';
import { createAuditEvent } from '../../utils/audit';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';
import { AGG_PROMPT_VERSION } from '../../prompts/agg-v2.1';
import { generateId } from '../../utils/id';

const REQUIRED_DISCLAIMERS = [
  'This analysis is for informational purposes only and does not constitute legal advice.',
  'You should consult with a licensed attorney regarding your specific situation.',
  'This evaluation is based solely on the information provided in the briefs and may not capture all relevant facts.',
  'MeritView makes no guarantees about the accuracy or completeness of this analysis.',
];

const MIN_EVALUATOR_OUTPUTS = 3;

export async function getPendingAggregations() {
  const disputes = await prisma.dispute.findMany({
    where: {
      state: 'COMPLETED',
      deletedAt: null,
      opinions: null,
      evaluatorOutputs: {
        some: {},
      },
    },
    include: {
      _count: {
        select: { evaluatorOutputs: true, parties: true },
      },
      parties: {
        select: { id: true, role: true, userId: true, briefStatus: true },
      },
    },
    orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
  });

  return disputes.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    state: d.state,
    evaluatorOutputCount: d._count.evaluatorOutputs,
    parties: d.parties,
    completedAt: d.completedAt,
    createdAt: d.createdAt,
  })) as Array<{
    id: string;
    title: string;
    category: string;
    state: string;
    evaluatorOutputCount: number;
    parties: Array<{ id: string; role: string; userId: string | null; briefStatus: string }>;
    completedAt: Date | null;
    createdAt: Date;
  }>;
}

export async function getDisputeWithEvaluations(disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: {
      parties: true,
      briefs: true,
      evaluatorOutputs: {
        orderBy: { createdAt: 'asc' },
      },
      opinions: true,
      payments: true,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  return dispute;
}

function computeInterEvaluatorAgreement(evaluatorOutputs: Array<{ structuredOutput: any }>): number {
  if (evaluatorOutputs.length < 2) return 1.0;

  const outcomes = evaluatorOutputs.map((eo) => {
    const so = eo.structuredOutput as any;
    return so?.final_opinion?.overall_assessment || so?.consolidated_assessment || '';
  });

  if (outcomes.length < 2) return 1.0;

  let agreementPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < outcomes.length; i++) {
    for (let j = i + 1; j < outcomes.length; j++) {
      totalPairs++;
      const wordOverlap = computeWordOverlap(outcomes[i], outcomes[j]);
      if (wordOverlap > 0.5) agreementPairs++;
    }
  }

  return totalPairs > 0 ? parseFloat((agreementPairs / totalPairs).toFixed(3)) : 1.0;
}

function computeWordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  return intersection / Math.min(wordsA.size, wordsB.size);
}

function computeOverallConfidence(evaluatorOutputs: Array<{ structuredOutput: any }>): number {
  if (evaluatorOutputs.length === 0) return 0;

  const scores = evaluatorOutputs.map((eo) => {
    const so = eo.structuredOutput as any;
    return so?.final_opinion?.confidence_score ??
           so?.aggregation_metadata?.overall_confidence_score ??
           0.5;
  });

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  const adjusted = mean - stdDev * 0.5;
  return parseFloat(Math.max(0, Math.min(1, adjusted)).toFixed(3));
}

export async function generateOpinion(
  disputeId: string,
  adminId: string,
  opinionData: {
    content: string;
    disclaimers: string[];
    aggregatorProvider: string;
    aggregatorModelId: string;
    interEvaluatorAgreement?: number;
    overallConfidence?: number;
  }
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: {
      evaluatorOutputs: {
        orderBy: { createdAt: 'asc' },
      },
      opinions: true,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'COMPLETED') {
    throw new BadRequestError(`Dispute is in state "${dispute.state}". Only COMPLETED disputes can be aggregated.`);
  }

  if (dispute.opinions) {
    throw new ConflictError('An opinion has already been generated for this dispute');
  }

  if (dispute.evaluatorOutputs.length < MIN_EVALUATOR_OUTPUTS) {
    throw new BadRequestError(
      `Need at least ${MIN_EVALUATOR_OUTPUTS} evaluator outputs to generate an opinion (found ${dispute.evaluatorOutputs.length})`
    );
  }

  const missingDisclaimers = REQUIRED_DISCLAIMERS.filter(
    (d) => !opinionData.disclaimers.some((od) => od.includes(d.substring(0, 40)))
  );

  if (missingDisclaimers.length > 0) {
    throw new BadRequestError(`Missing required disclaimers: ${missingDisclaimers.join('; ')}`);
  }

  const fullContent = [
    opinionData.content,
    '',
    '---',
    'Disclaimers:',
    ...opinionData.disclaimers,
  ].join('\n');

  const { encryptedContent, contentEncryptionKeyId } = encrypt(fullContent);

  const interEvaluatorAgreement = opinionData.interEvaluatorAgreement ?? computeInterEvaluatorAgreement(dispute.evaluatorOutputs);
  const overallConfidence = opinionData.overallConfidence ?? computeOverallConfidence(dispute.evaluatorOutputs);

  const evaluatorOutputIds = dispute.evaluatorOutputs.map((eo) => eo.id);

  const totalCostUsd = dispute.evaluatorOutputs.reduce(
    (sum, eo) => sum + Number(eo.costUsd),
    0
  );

  const opinion = await prisma.$transaction(async (tx) => {
    const op = await tx.opinion.create({
      data: {
        id: generateId('opin'),
        disputeId,
        encryptedContent,
        contentEncryptionKeyId,
        evalPromptVersion: dispute.evaluatorOutputs[0]?.promptVersion || 'v3.2',
        aggPromptVersion: AGG_PROMPT_VERSION,
        evaluatorOutputIds,
        interEvaluatorAgreement,
        overallConfidence,
        aggregatorProvider: opinionData.aggregatorProvider,
        aggregatorModelId: opinionData.aggregatorModelId,
        totalCostUsd,
      },
    });

    await createAuditEvent({
      actorId: adminId,
      actorType: 'ADMIN',
      eventType: 'OPINION_GENERATED',
      resourceType: 'dispute',
      resourceId: disputeId,
      metadata: {
        opinionId: op.id,
        evaluatorOutputIds,
        interEvaluatorAgreement,
        overallConfidence,
        totalCostUsd: Number(totalCostUsd),
      },
      tx,
    });

    return op;
  });

  logger.info('Opinion generated', {
    disputeId,
    opinionId: opinion.id,
    adminId,
    interEvaluatorAgreement,
    overallConfidence,
  });

  return opinion;
}

export async function publishOpinion(disputeId: string, adminId: string) {
  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
  });

  if (!opinion) {
    throw new NotFoundError('No opinion found for this dispute. Generate an opinion first.');
  }

  if (opinion.deliveredAt) {
    throw new ConflictError('Opinion is already published');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const op = await tx.opinion.update({
      where: { id: opinion.id },
      data: { deliveredAt: new Date() },
    });

    await createAuditEvent({
      actorId: adminId,
      actorType: 'ADMIN',
      eventType: 'OPINION_PUBLISHED',
      resourceType: 'dispute',
      resourceId: disputeId,
      metadata: { opinionId: opinion.id },
      tx,
    });

    return op;
  });

  logger.info('Opinion published', { disputeId, opinionId: opinion.id, adminId });

  return updated;
}

export async function unpublishOpinion(disputeId: string, adminId: string) {
  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
  });

  if (!opinion) {
    throw new NotFoundError('No opinion found for this dispute');
  }

  if (!opinion.deliveredAt) {
    throw new ConflictError('Opinion is not published');
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (opinion.deliveredAt < oneHourAgo) {
    throw new ConflictError('Cannot unpublish opinion after 1 hour of publication');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const op = await tx.opinion.update({
      where: { id: opinion.id },
      data: { deliveredAt: null },
    });

    await createAuditEvent({
      actorId: adminId,
      actorType: 'ADMIN',
      eventType: 'OPINION_UNPUBLISHED',
      resourceType: 'dispute',
      resourceId: disputeId,
      metadata: { opinionId: opinion.id },
      tx,
    });

    return op;
  });

  logger.info('Opinion unpublished', { disputeId, opinionId: opinion.id, adminId });

  return updated;
}

import { providerRegistry } from '../../providers/registry.js';
import { modelRouter } from '../../providers/model-router.js';
import { AGGREGATE_PROMPT_V1 } from '../../prompts/aggregate-v1.0.js';

export async function aggregateEvaluations(disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      evaluatorOutputs: true,
      briefs: true,
    }
  });

  if (!dispute || dispute.evaluatorOutputs.length === 0) return;

  const promptText = `
  Dispute Title: ${dispute.title}
  
  Evaluator Outputs:
  ${JSON.stringify(dispute.evaluatorOutputs.map(o => o.structuredOutput), null, 2)}
  `;

  try {
    const routed = modelRouter.resolve('aggregation');
    const result = await routed.provider.generateCompletion(
      promptText, AGGREGATE_PROMPT_V1
    );

    let parsedContent: string;
    let parseSuccess = false;
    try {
      const parsed = JSON.parse(result.content);
      parsedContent = JSON.stringify(parsed, null, 2);
      parseSuccess = true;
    } catch {
      parsedContent = result.content;
    }

    if (parseSuccess) {
      await generateOpinion(disputeId, 'system', {
        content: parsedContent,
        disclaimers: REQUIRED_DISCLAIMERS,
        aggregatorProvider: routed.providerName,
        aggregatorModelId: routed.modelId,
      });
      logger.info('Auto-aggregation completed', { disputeId });
    } else {
      logger.warn('Failed to parse aggregator output', { disputeId });
    }
  } catch (err) {
    logger.error('Aggregation failed', err as Error);
  }
}
