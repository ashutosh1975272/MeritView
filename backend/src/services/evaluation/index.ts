import { DisputeState, PaymentStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ProviderRegistry, createGroqLlama3Provider, createGroqMixtralProvider, createGemini15ProProvider } from '../../providers';
import { withRetry, withTimeout } from '../../providers/retry';
import { getEvalPrompt, EVAL_PROMPT_VERSION } from '../../prompts/eval-v3.2';
import { decrypt } from '../../utils/crypto';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { getEnv } from '../../config/env';

const env = getEnv();
const MIN_SUCCESSFUL_EVALUATORS = 3;
const MAX_ATTEMPTS = 3;
const BACKOFF_1S = 1000;
const BACKOFF_2S = 2000;
const EVALUATOR_TIMEOUT_MS = 60_000;

const providerConfigs = [
  { providerKey: 'groq-llama', name: 'groq', model: 'llama-3-70b-8192' },
  { providerKey: 'groq-mixtral', name: 'groq', model: 'mixtral-8x7b-32768' },
  { providerKey: 'gemini-pro', name: 'gemini', model: 'gemini-1.5-pro' },
];

export const evaluationRegistry = new ProviderRegistry();

export function initEvaluationRegistry(): void {
  if (env.GROQ_API_KEY) {
    evaluationRegistry.register('groq-llama', createGroqLlama3Provider(env.GROQ_API_KEY));
    evaluationRegistry.register('groq-mixtral', createGroqMixtralProvider(env.GROQ_API_KEY));
  }
  if (env.GEMINI_API_KEY) {
    evaluationRegistry.register('gemini-pro', createGemini15ProProvider(env.GEMINI_API_KEY));
  }
}

export interface EvaluationJobInput {
  disputeId: string;
  partyId: string;
}

export interface EvaluatorOutputRecord {
  id: string;
  llmProvider: string;
  modelId: string;
  promptVersion: string;
  structuredOutput: Record<string, unknown>;
  rawOutput: string | null;
  parseSuccess: boolean;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  attemptNumber: number;
}

export interface EvaluationJobResult {
  disputeId: string;
  evaluatorOutputs: EvaluatorOutputRecord[];
  state: DisputeState;
  successCount: number;
  failureCount: number;
}

export async function createEvaluationJob(input: EvaluationJobInput): Promise<EvaluationJobResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
    include: {
      evaluatorOutputs: true,
      briefs: true,
      payments: true,
      parties: true,
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'PAYMENT_PENDING' && dispute.state !== 'UNDER_ANALYSIS') {
    throw new ValidationError(`Cannot evaluate dispute in state: ${dispute.state}`);
  }

  const brief = dispute.briefs.find(b => b.status === 'SUBMITTED');
  if (!brief) {
    throw new ValidationError('No submitted brief found for this dispute');
  }

  const decryptedContent = decrypt(
    brief.encryptedContent.toString('base64'),
    brief.contentEncryptionKeyId
  );

  await prisma.dispute.update({
    where: { id: input.disputeId },
    data: { state: 'UNDER_ANALYSIS', stateChangedAt: new Date() },
  });

  const sanitizedContent = sanitizeForEvaluation(decryptedContent);
  const result = await dispatchEvaluators(input.disputeId, sanitizedContent);

  return result;
}

async function dispatchSingleEvaluator(
  disputeId: string,
  providerKey: string,
  prompt: string,
  attemptNumber: number
): Promise<EvaluatorOutputRecord | null> {
  const provider = evaluationRegistry.get(providerKey);
  if (!provider) {
    logger.warn('Provider not registered', { providerKey });
    return null;
  }

  const startTime = Date.now();
  try {
    const completion = await withTimeout(
      () => withRetry(
        async () => provider.generateCompletion(prompt, { temperature: 0.1, maxTokens: 2048, jsonMode: true }),
        { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 2, jitter: false }
      ),
      EVALUATOR_TIMEOUT_MS,
      `${providerKey} timed out after ${EVALUATOR_TIMEOUT_MS}ms`
    );

    const durationMs = Date.now() - startTime;
    const injectionDetected = detectPromptInjection(completion.content);
    const parseSuccess = completion.parseSuccess && !injectionDetected;

    let structuredOutput: Record<string, unknown> = {};
    if (completion.structuredOutput) {
      structuredOutput = completion.structuredOutput;
    } else if (parseSuccess) {
      try {
        structuredOutput = JSON.parse(completion.content);
      } catch {
        structuredOutput = { rawContent: completion.content };
      }
    }

    return {
      id: completion.id,
      llmProvider: provider.name,
      modelId: provider.modelId,
      promptVersion: EVAL_PROMPT_VERSION,
      structuredOutput,
      rawOutput: completion.content,
      parseSuccess,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      costUsd: completion.costUsd,
      durationMs,
      attemptNumber,
    };
  } catch (error: any) {
    logger.warn(`Evaluator ${providerKey} attempt ${attemptNumber} failed`, {
      disputeId,
      provider: providerKey,
      attempt: attemptNumber,
      error: error.message,
    });
    return null;
  }
}

async function dispatchEvaluators(
  disputeId: string,
  briefContent: string
): Promise<EvaluationJobResult> {
  const prompt = getEvalPrompt(briefContent);

  const results = await Promise.allSettled(
    providerConfigs.map(async (config) => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await dispatchSingleEvaluator(disputeId, config.providerKey, prompt, attempt);
        if (result !== null && result.parseSuccess) {
          return result;
        }
        if (attempt < MAX_ATTEMPTS) {
          const delay = attempt === 1 ? BACKOFF_1S : BACKOFF_2S;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      const lastResult = await dispatchSingleEvaluator(disputeId, config.providerKey, prompt, MAX_ATTEMPTS);
      return lastResult;
    })
  );

  const allOutputs: EvaluatorOutputRecord[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      allOutputs.push(result.value);
    }
  }

  const successful = allOutputs.filter(o => o.parseSuccess);
  const failed = allOutputs.filter(o => !o.parseSuccess);

  const savedOutputs: EvaluatorOutputRecord[] = [];
  for (const output of allOutputs) {
    const saved = await prisma.evaluatorOutput.create({
      data: {
        disputeId,
        llmProvider: output.llmProvider,
        modelId: output.modelId,
        promptVersion: output.promptVersion,
        structuredOutput: output.structuredOutput,
        rawOutput: output.rawOutput,
        parseSuccess: output.parseSuccess,
        inputTokens: output.inputTokens,
        outputTokens: output.outputTokens,
        costUsd: output.costUsd,
        durationMs: output.durationMs,
        attemptNumber: output.attemptNumber,
      },
    });
    savedOutputs.push({
      id: saved.id,
      llmProvider: saved.llmProvider,
      modelId: saved.modelId,
      promptVersion: saved.promptVersion,
      structuredOutput: saved.structuredOutput as Record<string, unknown>,
      rawOutput: saved.rawOutput,
      parseSuccess: saved.parseSuccess,
      inputTokens: saved.inputTokens,
      outputTokens: saved.outputTokens,
      costUsd: Number(saved.costUsd),
      durationMs: saved.durationMs,
      attemptNumber: saved.attemptNumber,
    });
  }

  const successCount = savedOutputs.filter(o => o.parseSuccess).length;
  const failureCount = savedOutputs.filter(o => !o.parseSuccess).length;

  if (successCount >= MIN_SUCCESSFUL_EVALUATORS) {
    await prisma.dispute.update({
      where: { id: disputeId },
      data: { state: 'AWAITING_AGGREGATION', stateChangedAt: new Date() },
    });

    logger.info('Evaluation completed successfully', {
      disputeId,
      successCount,
      failureCount,
      totalCost: savedOutputs.reduce((s, o) => s + o.costUsd, 0),
    });
  } else {
    await prisma.dispute.update({
      where: { id: disputeId },
      data: { state: 'FAILED', stateChangedAt: new Date() },
    });

    await autoRefund(disputeId);

    logger.warn('Evaluation failed - insufficient successful outputs', {
      disputeId,
      successCount,
      failureCount,
      minRequired: MIN_SUCCESSFUL_EVALUATORS,
    });
  }

  return {
    disputeId,
    evaluatorOutputs: savedOutputs,
    state: successCount >= MIN_SUCCESSFUL_EVALUATORS ? 'AWAITING_AGGREGATION' : 'FAILED',
    successCount,
    failureCount,
  };
}

async function autoRefund(disputeId: string): Promise<void> {
  try {
    const succeededPayment = await prisma.payment.findFirst({
      where: { disputeId, status: 'SUCCEEDED' as PaymentStatus },
    });

    if (succeededPayment) {
      await prisma.payment.update({
        where: { id: succeededPayment.id },
        data: {
          status: 'REFUNDED' as PaymentStatus,
          refundedAmountUsd: succeededPayment.amountUsd,
          refundReason: 'Auto-refund: evaluation failed to meet minimum threshold',
          refundedAt: new Date(),
        },
      });

      logger.info('Auto-refund processed for failed evaluation', { disputeId });
    }
  } catch (error: any) {
    logger.error('Auto-refund failed', error, { disputeId });
  }
}

export async function getEvaluationStatus(disputeId: string): Promise<{
  disputeId: string;
  state: DisputeState;
  evaluatorOutputCount: number;
  evaluatorOutputs: any[];
  totalCost: number;
  minSuccessful: number;
  successCount: number;
  failureCount: number;
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
  const failureCount = dispute.evaluatorOutputs.filter(e => !e.parseSuccess).length;

  return {
    disputeId: dispute.id,
    state: dispute.state,
    evaluatorOutputCount: dispute.evaluatorOutputs.length,
    evaluatorOutputs: dispute.evaluatorOutputs,
    totalCost,
    minSuccessful: MIN_SUCCESSFUL_EVALUATORS,
    successCount,
    failureCount,
  };
}

export function decodeContent(encryptedContent: string, keyId: string): string {
  return decrypt(encryptedContent, keyId);
}

export function sanitizeForEvaluation(content: string): string {
  const sensitivePatterns = [
    /jwt_token\s*[:=]\s*['"][^'"]+['"]/gi,
    /api_key\s*[:=]\s*['"][^'"]+['"]/gi,
    /api[-_]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    /(?:sk|pk|api)[-_]?[a-zA-Z0-9]{16,}/g,
    /\b\d{16}\b/g,
    /\b\d{3}-\d{2}-\d{4}\b/g,
  ];

  let sanitized = content;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

export function detectPromptInjection(output: string): boolean {
  const injectionPatterns = [
    /ignore\s+(?:all\s+)?(?:previous\s+|the\s+|your\s+)?(?:instructions|prompts|rules)/i,
    /disregard\s+(?:all\s+)?(?:previous\s+|the\s+|your\s+)?(?:instructions|prompts|rules)/i,
    /forget\s+(?:your\s+|the\s+|all\s+)?(?:instructions|prompts|rules)/i,
    /act\s+as\s+(?:a\s+|an\s+)?(?:unrestricted|unfiltered|jailbreak)/i,
    /pretend\s+you\s+(?:are|have)\s+(?:not|never)\s+(?:have\s+|had\s+)?restrictions/i,
    /ignore\s+all\s+(?:constraints|restrictions|guidelines|directives)/i,
    /you\s+are\s+now\s+(?:a\s+|an\s+)?(?:free|unconstrained|unfiltered)\s+assistant/i,
    /override\s+(?:your\s+|the\s+)(?:system\s+|previous\s+)?(?:prompt|instructions)/i,
  ];

  const lower = output.toLowerCase();
  return injectionPatterns.some(pattern => pattern.test(lower));
}
