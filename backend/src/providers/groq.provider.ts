import Groq from 'groq-sdk';
import { LLMProvider, CompletionResult, CompletionChunk, HealthStatus, ProviderCapabilities } from './llm.js';
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  ProviderInvalidResponseError,
  ProviderConfigurationError,
} from './errors.js';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class GroqProvider implements LLMProvider {
  readonly name = 'groq';
  private client: Groq | null = null;
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(
    modelId: string = 'llama-3.3-70b-versatile',
    maxTokens: number = 8192,
    timeoutMs: number = 60000
  ) {
    this.modelId = modelId;
    this.maxTokens = maxTokens;
    this.timeoutMs = timeoutMs;
  }

  private getClient(): Groq {
    if (this.client) return this.client;

    const apiKey = getEnv().GROQ_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigurationError(this.name, 'GROQ_API_KEY not configured');
    }

    this.client = new Groq({ apiKey });
    return this.client;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    const client = this.getClient();
    const startTime = Date.now();

    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const response = await client.chat.completions.create(
        {
          model: this.modelId,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.1,
        },
        { signal: controller.signal }
      );

      const content = response.choices?.[0]?.message?.content || '';
      const usage = response.usage;

      return {
        content,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        durationMs: Date.now() - startTime,
        modelId: response.model || this.modelId,
      };
    } catch (error: unknown) {
      const elapsed = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderTimeoutError(this.name, this.timeoutMs);
      }

      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status === 401) {
          throw new ProviderAuthenticationError(this.name);
        }
        if (status === 429) {
          throw new ProviderRateLimitError(this.name);
        }
        if (status >= 500) {
          throw new ProviderUnavailableError(this.name, `Groq API error: ${status}`);
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

    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const stream = await client.chat.completions.create(
        {
          model: this.modelId,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.1,
          stream: true,
        },
        { signal: controller.signal }
      );

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          yield { content: delta, isFinal: false };
        }
        if (chunk.choices?.[0]?.finish_reason === 'stop') {
          const usage = chunk.x_groq?.usage;
          yield {
            content: '',
            isFinal: true,
            inputTokens: usage?.prompt_tokens || 0,
            outputTokens: usage?.completion_tokens || 0,
            modelId: chunk.model || this.modelId,
          };
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderTimeoutError(this.name, this.timeoutMs);
      }
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status === 401) throw new ProviderAuthenticationError(this.name);
        if (status === 429) throw new ProviderRateLimitError(this.name);
        if (status >= 500) throw new ProviderUnavailableError(this.name, `Groq API error: ${status}`);
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

      await client.chat.completions.create(
        {
          model: this.modelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        },
        { signal: AbortSignal.timeout(10000) }
      );

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
      hasNoTrainingGuarantee: true,
      supportedModels: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
        'deepseek-r1-distill-llama-70b',
        'llama-3.2-90b-vision-preview',
        'llama-3.2-3b-preview',
        'llama-3.2-11b-vision-preview',
      ],
    };
  }
}
