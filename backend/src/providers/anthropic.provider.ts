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

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  constructor(
    modelId: string = 'claude-sonnet-4-20250514',
    maxTokens: number = 8192,
    timeoutMs: number = 60000
  ) {
    this.modelId = modelId;
    this.maxTokens = maxTokens;
    this.timeoutMs = timeoutMs;
  }

  private getApiKey(): string {
    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigurationError(this.name, 'ANTHROPIC_API_KEY not configured');
    }
    return apiKey;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    const apiKey = this.getApiKey();
    const startTime = Date.now();

    const messages: { role: string; content: string }[] = [{ role: 'user', content: prompt }];

    const body: Record<string, unknown> = {
      model: this.modelId,
      max_tokens: this.maxTokens,
      temperature: 0.1,
      messages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = (await response.json()) as {
        content: { text: string }[];
        usage: { input_tokens: number; output_tokens: number };
      };

      const content = data.content.map((c) => c.text).join('');

      return {
        content,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        durationMs: Date.now() - startTime,
        modelId: this.modelId,
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

    const messages: { role: string; content: string }[] = [{ role: 'user', content: prompt }];

    const body: Record<string, unknown> = {
      model: this.modelId,
      max_tokens: this.maxTokens,
      temperature: 0.1,
      messages,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
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
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield { content: parsed.delta.text, isFinal: false };
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
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
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
      dataResidency: 'US',
      hasNoTrainingGuarantee: true,
      supportedModels: [
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
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

    const message = (body?.error as { message?: string })?.message || response.statusText;

    switch (response.status) {
      case 401:
      case 403:
        throw new ProviderAuthenticationError(this.name, message);
      case 429:
        throw new ProviderRateLimitError(this.name, message);
      case 529:
        throw new ProviderUnavailableError(this.name, 'Anthropic API overloaded');
      default:
        if (response.status >= 500) {
          throw new ProviderUnavailableError(this.name, `Anthropic API error: ${response.status}`);
        }
        throw new ProviderUnavailableError(this.name, message);
    }
  }
}
