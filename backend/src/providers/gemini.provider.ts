import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, CompletionResult, CompletionChunk, HealthStatus, ProviderCapabilities } from './llm.js';
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  ProviderConfigurationError,
} from './errors.js';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(
    modelId: string = 'gemini-1.5-pro',
    maxTokens: number = 8192,
    timeoutMs: number = 60000
  ) {
    this.modelId = modelId;
    this.maxTokens = maxTokens;
    this.timeoutMs = timeoutMs;
  }

  private getClient(): GoogleGenerativeAI {
    if (this.client) return this.client;

    const apiKey = getEnv().GEMINI_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigurationError(this.name, 'GEMINI_API_KEY not configured');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    return this.client;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    const client = this.getClient();
    const startTime = Date.now();

    const model = client.getGenerativeModel({
      model: this.modelId,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: 0.1,
      },
    });

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

      const result = await model.generateContent(fullPrompt, {
        signal: controller.signal,
      });

      const response = result.response;
      const content = response.text();
      const usage = response.usageMetadata;

      return {
        content,
        inputTokens: usage?.promptTokenCount || 0,
        outputTokens: usage?.candidatesTokenCount || 0,
        durationMs: Date.now() - startTime,
        modelId: this.modelId,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderTimeoutError(this.name, this.timeoutMs);
      }

      if (error && typeof error === 'object') {
        const err = error as { status?: number; message?: string; code?: number };
        if (err.status === 401 || err.code === 401) {
          throw new ProviderAuthenticationError(this.name);
        }
        if (err.status === 429 || err.code === 429) {
          throw new ProviderRateLimitError(this.name);
        }
        if (err.status && err.status >= 500) {
          throw new ProviderUnavailableError(this.name, `Gemini API error: ${err.status}`);
        }
        if (err.message?.includes('SAFETY')) {
          throw new ProviderUnavailableError(this.name, 'Content blocked by safety filters');
        }
      }

      throw new ProviderUnavailableError(
        this.name,
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async *generateCompletionStream(prompt: string, systemPrompt?: string): AsyncIterable<CompletionChunk> {
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: this.modelId,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: 0.1,
      },
    });

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const result = await model.generateContentStream(fullPrompt, {
        signal: controller.signal,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { content: text, isFinal: false };
        }
      }

      const response = await result.response;
      const usage = response.usageMetadata;

      yield {
        content: '',
        isFinal: true,
        inputTokens: usage?.promptTokenCount || 0,
        outputTokens: usage?.candidatesTokenCount || 0,
        modelId: this.modelId,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderTimeoutError(this.name, this.timeoutMs);
      }
      if (error && typeof error === 'object') {
        const err = error as { status?: number; message?: string; code?: number };
        if (err.status === 401 || err.code === 401) throw new ProviderAuthenticationError(this.name);
        if (err.status === 429 || err.code === 429) throw new ProviderRateLimitError(this.name);
        if (err.status && err.status >= 500) throw new ProviderUnavailableError(this.name, `Gemini API error: ${err.status}`);
      }
      throw new ProviderUnavailableError(
        this.name,
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: this.modelId,
        generationConfig: { maxOutputTokens: 1 },
      });

      const result = await model.generateContent('ping', {
        signal: AbortSignal.timeout(10000),
      });

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error: unknown) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxTokens: this.maxTokens,
      supportsStreaming: true,
      dataResidency: 'US',
      hasNoTrainingGuarantee: false,
      supportedModels: [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
      ],
    };
  }
}
