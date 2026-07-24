import Groq from 'groq-sdk';
import { LLMProvider, ProviderCapabilities } from './llm';
import { PromptCompletionResult } from './types';
import { ProviderAuthenticationError, ProviderError, ProviderRateLimitError, ProviderTimeoutError } from './errors';
import { estimateCost, isOverCostThreshold } from './cost';
import { withRetry, withTimeout } from './retry';

const GROQ_TIMEOUT_MS = 60_000;

export class GroqProvider implements LLMProvider {
  readonly name = 'groq';
  readonly modelId: string;
  readonly capabilities: ProviderCapabilities;

  private readonly client: Groq;
  private readonly apiKey: string;

  constructor(modelId: string, apiKey: string) {
    this.modelId = modelId;
    this.apiKey = apiKey;
    this.client = new Groq({ apiKey });
    this.capabilities = {
      supportsStreaming: false,
      maxContextTokens: modelId === 'llama-3-70b-8192' ? 8192 : 32768,
      supportsJsonMode: true,
      hasTrainingGuarantee: true,
      dataResidencyRegion: 'US',
    };
  }

  async generateCompletion(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    }
  ): Promise<PromptCompletionResult> {
    const startTime = Date.now();

    try {
      const result = await withTimeout(
        () =>
          withRetry(
            async () => {
              return this.client.chat.completions.create({
                model: this.modelId,
                messages: [{ role: 'user', content: prompt }],
                temperature: options?.temperature ?? 0.1,
                max_tokens: options?.maxTokens ?? 2048,
                response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
              });
            },
            { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2, jitter: true }
          ),
        GROQ_TIMEOUT_MS,
        `Groq ${this.modelId} timed out after ${GROQ_TIMEOUT_MS}ms`
      );

      const choice = result.choices?.[0];
      const content = choice?.message?.content || '';
      const latencyMs = Date.now() - startTime;

      const inputTokens = result.usage?.prompt_tokens || 0;
      const outputTokens = result.usage?.completion_tokens || 0;
      const costUsd = estimateCost({
        inputTokens,
        outputTokens,
        modelId: this.modelId,
        provider: 'groq',
      });

      if (isOverCostThreshold(costUsd)) {
        console.warn(`Groq cost threshold exceeded: $${costUsd} for ${this.modelId}`);
      }

      return {
        id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        provider: this.name,
        modelId: this.modelId,
        content,
        finishReason: choice?.finish_reason || 'unknown',
        inputTokens,
        outputTokens,
        latencyMs,
        costUsd,
        timestamp: new Date(),
        parseSuccess: true,
        attemptNumber: 1,
      };
    } catch (error: any) {
      if (error.status === 401) {
        throw new ProviderAuthenticationError(this.name, error.message);
      }
      if (error.status === 429) {
        throw new ProviderRateLimitError(this.name, error.message);
      }
      if (error.status === 413) {
        throw new ProviderError(this.name, 'Prompt too long for provider', 400, false);
      }
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, GROQ_TIMEOUT_MS);
      }
      throw new ProviderError(this.name, error.message || 'Generation failed', 502, true);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; lastChecked: Date; errorMessage?: string }> {
    const { checkGroqHealth } = await import('./health.js');
    return checkGroqHealth(this.apiKey);
  }

  estimateCost(inputTokens: number, outputTokens: number): { estimatedUsd: number; inputTokens: number; outputTokens: number; model: string } {
    const estimatedUsd = estimateCost({
      inputTokens,
      outputTokens,
      modelId: this.modelId,
      provider: 'groq',
    });

    return {
      estimatedUsd,
      inputTokens,
      outputTokens,
      model: `${this.name}/${this.modelId}`,
    };
  }
}

export function createGroqLlama3Provider(apiKey: string): LLMProvider {
  return new GroqProvider('llama-3-70b-8192', apiKey);
}

export function createGroqMixtralProvider(apiKey: string): LLMProvider {
  return new GroqProvider('mixtral-8x7b-32768', apiKey);
}
