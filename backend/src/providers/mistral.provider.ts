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

export class MistralProvider implements LLMProvider {
  readonly name = 'mistral';
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;
  private readonly baseUrl = 'https://api.mistral.ai/v1';

  constructor(
    modelId: string = 'mistral-large-latest',
    maxTokens: number = 8192,
    timeoutMs: number = 60000
  ) {
    this.modelId = modelId;
    this.maxTokens = maxTokens;
    this.timeoutMs = timeoutMs;
  }

  private getApiKey(): string {
    const apiKey = getEnv().MISTRAL_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigurationError(this.name, 'MISTRAL_API_KEY not configured');
    }
    return apiKey;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    const apiKey = this.getApiKey();
    const startTime = Date.now();

    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string | null } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
        model: string;
      };

      return {
        content: data.choices?.[0]?.message?.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        durationMs: Date.now() - startTime,
        modelId: data.model || this.modelId,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderTimeoutError(this.name, this.timeoutMs);
      }
      if (error instanceof ProviderAuthenticationError ||
          error instanceof ProviderRateLimitError ||
          error instanceof ProviderUnavailableError) {
        throw error;
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
    const apiKey = this.getApiKey();

    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.1,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new ProviderUnavailableError(this.name, 'No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { content: '', isFinal: true, modelId: this.modelId };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield { content: delta.content, isFinal: false };
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      yield { content: '', isFinal: true, modelId: this.modelId };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderTimeoutError(this.name, this.timeoutMs);
      }
      if (error instanceof ProviderAuthenticationError ||
          error instanceof ProviderRateLimitError ||
          error instanceof ProviderUnavailableError) {
        throw error;
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
      const apiKey = this.getApiKey();
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      return {
        healthy: response.ok,
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
      dataResidency: 'EU',
      hasNoTrainingGuarantee: true,
      supportedModels: [
        'mistral-large-latest',
        'mistral-small-latest',
        'mistral-medium-latest',
      ],
    };
  }

  private async handleError(response: Response): Promise<never> {
    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }

    const message = (body?.message as string) || response.statusText;

    switch (response.status) {
      case 401:
      case 403:
        throw new ProviderAuthenticationError(this.name, message);
      case 429:
        throw new ProviderRateLimitError(this.name, message);
      default:
        if (response.status >= 500) {
          throw new ProviderUnavailableError(this.name, `Mistral API error: ${response.status}`);
        }
        throw new ProviderUnavailableError(this.name, message);
    }
  }
}
