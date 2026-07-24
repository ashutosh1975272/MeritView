import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ProviderCapabilities } from './llm';
import { PromptCompletionResult } from './types';
import { ProviderAuthenticationError, ProviderError, ProviderRateLimitError, ProviderTimeoutError } from './errors';
import { estimateCost } from './cost';
import { withRetry, withTimeout } from './retry';

const GEMINI_TIMEOUT_MS = 60_000;

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly modelId: string;
  readonly capabilities: ProviderCapabilities;

  private readonly client: GoogleGenerativeAI;
  private readonly apiKey: string;

  constructor(modelId: string, apiKey: string) {
    this.modelId = modelId;
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
    this.capabilities = {
      supportsStreaming: false,
      maxContextTokens: 1_048_576,
      supportsJsonMode: true,
      hasTrainingGuarantee: false,
      dataResidencyRegion: 'global',
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
              const model = this.client.getGenerativeModel({
                model: this.modelId,
                generationConfig: {
                  temperature: options?.temperature ?? 0.1,
                  maxOutputTokens: options?.maxTokens ?? 2048,
                  responseMimeType: options?.jsonMode ? 'application/json' : undefined,
                },
              });

              return model.generateContent(prompt);
            },
            { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2, jitter: true }
          ),
        GEMINI_TIMEOUT_MS,
        `Gemini ${this.modelId} timed out after ${GEMINI_TIMEOUT_MS}ms`
      );

      const response = result.response;
      const content = response.text() || '';
      const latencyMs = Date.now() - startTime;

      const usageMetadata = (result as any).usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount || 0;
      const outputTokens = usageMetadata?.candidatesTokenCount || 0;
      const costUsd = estimateCost({
        inputTokens,
        outputTokens,
        modelId: this.modelId,
        provider: 'gemini',
      });

      return {
        id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        provider: this.name,
        modelId: this.modelId,
        content,
        finishReason: 'stop',
        inputTokens,
        outputTokens,
        latencyMs,
        costUsd,
        timestamp: new Date(),
        parseSuccess: true,
        attemptNumber: 1,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Generation failed';
      if (errorMessage.includes('API key') || errorMessage.includes('403')) {
        throw new ProviderAuthenticationError(this.name, errorMessage);
      }
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        throw new ProviderRateLimitError(this.name, errorMessage);
      }
      if (errorMessage.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, GEMINI_TIMEOUT_MS);
      }
      throw new ProviderError(this.name, errorMessage, 502, true);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; lastChecked: Date; errorMessage?: string }> {
    const { checkGeminiHealth } = await import('./health.js');
    return checkGeminiHealth(this.apiKey);
  }

  estimateCost(inputTokens: number, outputTokens: number): { estimatedUsd: number; inputTokens: number; outputTokens: number; model: string } {
    const estimatedUsd = estimateCost({
      inputTokens,
      outputTokens,
      modelId: this.modelId,
      provider: 'gemini',
    });

    return {
      estimatedUsd,
      inputTokens,
      outputTokens,
      model: `${this.name}/${this.modelId}`,
    };
  }
}

export function createGemini15ProProvider(apiKey: string): LLMProvider {
  return new GeminiProvider('gemini-1.5-pro', apiKey);
}
