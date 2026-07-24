import { DisputeState } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ProviderRegistry } from '../../providers';
import { EVAL_PROMPT_VERSION } from '../../prompts/eval-v3.2';
import { encrypt, getActiveKeyId } from '../../utils/crypto';
import { ValidationError, NotFoundError, InternalError } from '../../utils/errors';

const MIN_SUCCESSFUL_EVALUATORS = 3;
const MAX_ATTEMPTS = 3;
const EVAL_REDIS_KEY_PREFIX = 'eval:';

export interface EvaluationJobInput {
  disputeId: string;
  briefContent: string;
}

export interface EvaluationJobResult {
  disputeId: string;
  evaluatorOutputs: Array<{
    id: string;
    llmProvider: string;
    modelId: string;
    structuredOutput: Record<string, unknown>;
    costUsd: number;
    latencyMs: number;
    parseSuccess: boolean;
    attemptNumber: number;
  }>;
  state: DisputeState;
  successCount: number;
  failureCount: number;
}

const providerConfigs = [
  { providerKey: 'groq-llama', name: 'groq', model: 'llama-3-70b-8192' },
  { providerKey: 'groq-mixtral', name: 'groq', model: 'mixtral-8x7b-32768' },
  { providerKey: 'gemini-pro', name: 'gemini', model: 'gemini-1.5-pro' },
];

export const evaluationRegistry = new ProviderRegistry();

export async function createEvaluationJob(input: EvaluationJobInput): Promise<EvaluationJobResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
    include: { evaluatorOutputs: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'PAYMENT_PENDING' && dispute.state !== 'UNDER_ANALYSIS') {
    throw new ValidationError(`Cannot evaluate dispute in state: ${dispute.state}`);
  }

  const results = await evaluationRegistry.dispatch(
    input.briefContent,
    providerConfigs.map(p => p.providerKey)
  );

  const successful = (results as any[]).filter((r: any) => r.parseSuccess);
  const failed = (results as any[]).filter((r: any) => !r.parseSuccess);

  if (successful.length < MIN_SUCCESSFUL_EVALUATORS) {
    await prisma.dispute.update({
      where: { id: input.disputeId },
      data: { state: 'FAILED', stateChangedAt: new Date() },
    });

    return {
      disputeId: input.disputeId,
      evaluatorOutputs: (results as any[]).map((r: any) => ({
        id: r.id,
        llmProvider: r.provider,
        modelId: r.modelId,
        structuredOutput: r.structuredOutput || {},
        costUsd: r.costUsd,
        latencyMs: r.latencyMs,
        parseSuccess: r.parseSuccess,
        attemptNumber: r.attemptNumber,
      })),
      state: 'FAILED',
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  const savedOutputs = await prisma.$transaction(
    (results as any[]).map((r: any) =>
      prisma.evaluatorOutput.create({
        data: {
          disputeId: input.disputeId,
          llmProvider: r.provider,
          modelId: r.modelId,
          promptVersion: EVAL_PROMPT_VERSION,
          structuredOutput: r.structuredOutput || {},
          rawOutput: r.content,
          parseSuccess: r.parseSuccess,
          parseErrors: r.parseErrors,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          costUsd: r.costUsd,
          durationMs: r.latencyMs,
          attemptNumber: r.attemptNumber,
        },
      })
    )
  );

  const newState = successful.length >= MIN_SUCCESSFUL_EVALUATORS ? 'AWAITING_AGGREGATION' : 'FAILED';

  await prisma.dispute.update({
    where: { id: input.disputeId },
    data: {
      state: newState,
      stateChangedAt: new Date(),
    },
  });

  logger.info('Evaluation job completed', {
    disputeId: input.disputeId,
    successCount: successful.length,
    failureCount: failed.length,
    totalCost: (results as any[]).reduce((sum: number, r: any) => sum + r.costUsd, 0),
  });

  return {
    disputeId: input.disputeId,
    evaluatorOutputs: successful.map((r: any) => ({
      id: r.id,
      llmProvider: r.provider,
      modelId: r.modelId,
      structuredOutput: r.structuredOutput || {},
      costUsd: r.costUsd,
      latencyMs: r.latencyMs,
      parseSuccess: r.parseSuccess,
      attemptNumber: r.attemptNumber,
    })),
    state: newState,
    successCount: successful.length,
    failureCount: failed.length,
  };
}

export async function getEvaluationStatus(disputeId: string): Promise<{
  disputeId: string;
  state: DisputeState;
  evaluatorOutputCount: number;
  evaluatorOutputs: any[];
  totalCost: number;
  minSuccessful: number;
}> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { evaluatorOutputs: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const totalCost = dispute.evaluatorOutputs.reduce((sum, e) => sum + Number(e.costUsd), 0);
  const successCount = dispute.evaluatorOutputs.filter(e => e.parseSuccess).length;

  return {
    disputeId: dispute.id,
    state: dispute.state,
    evaluatorOutputCount: dispute.evaluatorOutputs.length,
    evaluatorOutputs: dispute.evaluatorOutputs,
    totalCost,
    minSuccessful: MIN_SUCCESSFUL_EVALUATORS,
  };
}

export async function retryFailedEvaluation(disputeId: string): Promise<EvaluationJobResult> {
  throw new ValidationError('Retry requires explicit evaluation job invocation');
}

export function sanitizeForEvaluation(content: string): string {
  const sensitivePatterns = [
    /jwt_token\s*[:=]\s*['"][^'"]+['"]/gi,
    /api_key\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi,
  ];

  let sanitized = content;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

export function detectPromptInjection(output: string): boolean {
  const injectionPatterns = [
    /ignore (all |previous |the |your )(instructions|prompts|rules)/i,
    /disregard (all |previous |the |your )(instructions|prompts|rules)/i,
    /forget (your |the |all )(instructions|prompts|rules)/i,
    /act as (a |an )?(unrestricted|unfiltered|jailbreak)/i,
    /pretend you (are |have )(not |never )(have |had )?restrictions/i,
  ];

  const lower = output.toLowerCase();
  return injectionPatterns.some(pattern => pattern.test(lower));
}

