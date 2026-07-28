import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';
import { decrypt } from '../../utils/crypto.js';
import { BadRequestError, NotFoundError, InternalError } from '../../utils/errors.js';
import { providerRegistry } from '../../providers/registry.js';
import { withRetry } from '../../providers/retry.js';
import { estimateCost } from '../../providers/cost.js';
import { EVAL_PROMPT_V3_2, EVAL_PROMPT_VERSION } from '../../prompts/eval-v3.2.js';
import { LLMProvider } from '../../providers/llm.js';
import { EvaluationOutput, DispatchResult } from '../../providers/types.js';
import { ProviderError, CircuitBreakerOpenError } from '../../providers/errors.js';
import { addEmailJob } from '../../jobs/queues.js';
import { generateId } from '../../utils/id.js';
import { aggregateEvaluations } from '../aggregation/index.js';

const PROVIDER_TIMEOUT_MS = 60000;
const MIN_SUCCESSFUL_EVALUATIONS = 3;

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(prior|previous|above)\s+instructions/i,
  /disregard\s+(all\s+)?(prior|previous|above)\s+(instructions|directives)/i,
  /forget\s+(all\s+)?(prior|previous|above)/i,
  /system\s*(prompt|message|instruction)/i,
  /you\s+are\s+(not\s+)?(an?\s+)?(AI|assistant|bot)/i,
  /override\s+(all\s+)?(instructions|commands)/i,
  /new\s+instructions?:/i,
  /<\|im_start\|>/,
  /<\|im_end\|>/,
  /\{system\}/i,
  /\[system\]/i,
];

const SANITIZE_PATTERNS = [
  /<\|im_start\|>.*?<\|im_end\|>/gs,
  /\{system:.*?\}/gi,
  /\[system\].*?\[\/system\]/gis,
  /ignore\s+(all\s+)?(prior|previous|above)\s+instructions?.{0,200}/gi,
];

export function sanitizeInput(content: string): string {
  let sanitized = content;
  for (const pattern of SANITIZE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function validateOutput(output: string): { valid: boolean; flags: string[] } {
  const flags: string[] = [];
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(output)) {
      flags.push(pattern.source);
    }
  }
  return { valid: flags.length === 0, flags };
}

export async function decodeContent(encryptedContent: Buffer, keyId: string): Promise<string> {
  try {
    return decrypt(encryptedContent, keyId);
  } catch (error) {
    logger.error('Failed to decode brief content', error instanceof Error ? error : undefined);
    throw new BadRequestError('Failed to decode brief content');
  }
}

interface EvalProvider {
  name: string;
  provider: LLMProvider;
  modelId: string;
}

function getEvaluatorProviders(): EvalProvider[] {
  const providers: EvalProvider[] = [];
  const names = providerRegistry.getNames();

  for (const name of names) {
    if (name === 'fallback') continue;
    const provider = providerRegistry.get(name);
    const caps = provider.getCapabilities();
    for (const model of caps.supportedModels) {
      providers.push({ name, provider, modelId: model });
    }
  }

  return providers;
}

export async function createEvaluationJob(disputeId: string): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      briefs: {
        include: { party: true },
      },
      parties: true,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'UNDER_ANALYSIS') {
    throw new BadRequestError(
      `Cannot evaluate dispute in state "${dispute.state}". Expected "UNDER_ANALYSIS".`
    );
  }

  const submittedBriefs = dispute.briefs.filter((b) => b.status === 'SUBMITTED' || b.status === 'SEALED');
  if (submittedBriefs.length === 0) {
    throw new BadRequestError('No submitted briefs found for this dispute');
  }

  const allPartiesSubmitted = dispute.parties.every(p => p.briefStatus === 'SUBMITTED');
  if (!allPartiesSubmitted && dispute.parties.length > 1) {
    throw new BadRequestError('All parties must submit their briefs before evaluation can start');
  }

  const evaluators = getEvaluatorProviders();
  if (evaluators.length === 0) {
    throw new InternalError('No LLM providers configured for evaluation');
  }

  logger.info('Evaluation job created', { disputeId, briefCount: submittedBriefs.length, evaluatorCount: evaluators.length });
}

export async function dispatchEvaluators(disputeId: string): Promise<{
  results: DispatchResult[];
  successCount: number;
  failureCount: number;
  totalCost: number;
}> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      briefs: {
        include: { party: true },
      },
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const submittedBriefs = dispute.briefs.filter(
    (b) => b.status === 'SUBMITTED' || b.status === 'SEALED'
  );

  if (submittedBriefs.length === 0) {
    throw new BadRequestError('No submitted briefs found');
  }

  const briefContents: string[] = [];
  for (const brief of submittedBriefs) {
    const content = await decodeContent(brief.encryptedContent, brief.contentEncryptionKeyId);
    const sanitized = sanitizeInput(content);
    briefContents.push(sanitized);
  }

  const combinedPrompt = briefContents.join('\n\n---\n\n');
  const fullPrompt = `Dispute: ${dispute.title}\n\n${dispute.summary ? `Summary: ${dispute.summary}\n\n` : ''}Briefs:\n\n${combinedPrompt}`;

  const evaluators = getEvaluatorProviders();
  const dispatchTasks = evaluators.map(({ name, provider, modelId }) => {
    return async (): Promise<DispatchResult> => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const startTime = Date.now();

          const result = await providerRegistry.callWithCircuitBreaker(name, () =>
            provider.generateCompletion(fullPrompt, EVAL_PROMPT_V3_2)
          );

          const { valid, flags } = validateOutput(result.content);

          let parseSuccess = false;
          let structuredOutput: Record<string, unknown> = { raw: result.content };
          let parseErrors: Record<string, unknown> | undefined;

          if (valid) {
            try {
              structuredOutput = JSON.parse(result.content);
              parseSuccess = true;
            } catch {
              parseErrors = { message: 'Failed to parse LLM output as JSON', sample: result.content.substring(0, 200) };
            }
          } else {
            parseErrors = { flags, message: 'Prompt injection patterns detected in output' };
          }

          const costUsd = estimateCost(name, modelId, result.inputTokens, result.outputTokens);

          const output: EvaluationOutput = {
            disputeId,
            llmProvider: name,
            modelId: result.modelId,
            promptVersion: EVAL_PROMPT_VERSION,
            structuredOutput,
            rawOutput: result.content,
            parseSuccess,
            parseErrors,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            costUsd,
            durationMs: result.durationMs,
            attemptNumber: attempt,
          };

          await storeEvaluationOutput(output);

          logger.info('Evaluation dispatch successful', {
            provider: name,
            modelId: result.modelId,
            attempt,
            durationMs: result.durationMs,
            costUsd,
            parseSuccess,
          });

          return {
            provider: name,
            success: true,
            output,
            attemptNumber: attempt,
          };
        } catch (error: unknown) {
          const isRetryable =
            error instanceof ProviderError
              ? error.isRetryable
              : error instanceof CircuitBreakerOpenError
                ? false
                : attempt < 3;

          logger.warn('Evaluation attempt failed', {
            provider: name,
            attempt,
            error: error instanceof Error ? error.message : String(error),
            willRetry: isRetryable && attempt < 3,
          });

          if (!isRetryable || attempt >= 3) {
            return {
              provider: name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              attemptNumber: attempt,
            };
          }

          const delayMs = attempt === 1 ? 1000 : 2000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return {
        provider: name,
        success: false,
        error: 'Max retry attempts exceeded',
        attemptNumber: 3,
      };
    };
  });

  const settledResults = await Promise.allSettled(dispatchTasks.map((t) => t()));

  const results: DispatchResult[] = settledResults.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    return {
      provider: evaluators[i]?.name || 'unknown',
      success: false,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      attemptNumber: 1,
    };
  });

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const totalCost = results.reduce(
    (sum, r) => sum + (r.output?.costUsd || 0),
    0
  );

  logger.info('Evaluation dispatch complete', {
    disputeId,
    successCount,
    failureCount,
    totalCost,
    totalEvaluators: results.length,
  });

  if (successCount >= MIN_SUCCESSFUL_EVALUATIONS) {
    const completedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'COMPLETED',
        stateChangedAt: new Date(),
        completedAt: new Date(),
      },
    });
    const allParties = await prisma.party.findMany({ 
      where: { disputeId },
      include: { user: { select: { email: true } } }
    });
    for (const party of allParties) {
      if (party.user?.email) {
        await addEmailJob('opinion-ready', party.user.email, { disputeId });
      }
    }
    
    // Auto-aggregate evaluations
    await aggregateEvaluations(disputeId);
    
    logger.info('Evaluation threshold met, dispute completed', { disputeId, successCount });
  } else {
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        state: 'WITHDRAWN',
        stateChangedAt: new Date(),
      },
    });

    const succeededPayments = await prisma.payment.findMany({
      where: { disputeId, status: 'SUCCEEDED' },
    });

    for (const payment of succeededPayments) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          refundedAmountUsd: payment.amountUsd,
          refundReason: `Auto-refund: insufficient evaluator successes (${successCount}/${results.length})`,
          refundedAt: new Date(),
        },
      });
      logger.info('Auto-refund issued', { disputeId, paymentId: payment.id, amount: payment.amountUsd });
    }

    logger.warn('Evaluation threshold not met, dispute withdrawn with refund', {
      disputeId,
      successCount,
      required: MIN_SUCCESSFUL_EVALUATIONS,
    });
  }

  return { results, successCount, failureCount, totalCost };
}

async function storeEvaluationOutput(output: EvaluationOutput): Promise<void> {
  await prisma.evaluatorOutput.create({
    data: {
      id: generateId('eval'),
      disputeId: output.disputeId,
      llmProvider: output.llmProvider,
      modelId: output.modelId,
      promptVersion: output.promptVersion,
      structuredOutput: output.structuredOutput as any,
      rawOutput: output.rawOutput || null,
      parseSuccess: output.parseSuccess,
      parseErrors: output.parseErrors as any,
      inputTokens: output.inputTokens,
      outputTokens: output.outputTokens,
      costUsd: output.costUsd,
      durationMs: output.durationMs,
      attemptNumber: output.attemptNumber,
    },
  });
}

export async function getEvaluationStatus(disputeId: string): Promise<{
  state: string;
  evaluatorOutputs: Array<{
    id: string;
    llmProvider: string;
    modelId: string;
    promptVersion: string;
    parseSuccess: boolean;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
    attemptNumber: number;
    createdAt: Date;
  }>;
  totalCost: number;
  completedAt: Date | null;
}> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { state: true, completedAt: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const evaluatorOutputs = await prisma.evaluatorOutput.findMany({
    where: { disputeId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      llmProvider: true,
      modelId: true,
      promptVersion: true,
      parseSuccess: true,
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
      durationMs: true,
      attemptNumber: true,
      createdAt: true,
    },
  });

  const totalCost = evaluatorOutputs.reduce(
    (sum, o) => sum + Number(o.costUsd),
    0
  );

  return {
    state: dispute.state,
    evaluatorOutputs: evaluatorOutputs.map(o => ({ ...o, costUsd: Number(o.costUsd) })),
    totalCost,
    completedAt: dispute.completedAt,
  };
}
