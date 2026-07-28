import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../../providers/anthropic.provider';
import { OpenAIProvider } from '../../providers/openai.provider';
import { MistralProvider } from '../../providers/mistral.provider';
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  ProviderConfigurationError,
  ProviderInvalidResponseError,
} from '../../providers/errors';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    OPENAI_API_KEY: 'test-openai-key',
    MISTRAL_API_KEY: 'test-mistral-key',
  })),
}));

import { getEnv } from '../../config/env';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

function mockFetch(responseOverrides: Partial<Response> = {}, body: unknown = {}): void {
  const response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers({ 'content-type': 'application/json' }),
    body: null as ReadableStream | null,
    ...responseOverrides,
  } as Response;
  globalThis.fetch = vi.fn().mockResolvedValue(response);
}

function mockStreamFetch(chunks: string[], finalBody: Record<string, unknown> = {}): void {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  const response = {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    body: stream,
    json: vi.fn().mockResolvedValue(finalBody),
  } as unknown as Response;

  globalThis.fetch = vi.fn().mockResolvedValue(response);
}

describe('Provider Implementations', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('AnthropicProvider', () => {
    const provider = new AnthropicProvider('claude-sonnet-4-20250514', 4096, 30000);

    it('should generate completion successfully', async () => {
      mockFetch({}, {
        content: [{ text: 'Hello from Claude' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const result = await provider.generateCompletion('Hi', 'Be helpful');

      expect(result.content).toBe('Hello from Claude');
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(20);
      expect(result.modelId).toBe('claude-sonnet-4-20250514');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle 401 authentication error', async () => {
      mockFetch({ ok: false, status: 401, statusText: 'Unauthorized' });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should handle 429 rate limit error', async () => {
      mockFetch({ ok: false, status: 429, statusText: 'Too Many Requests' });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle 529 overloaded error', async () => {
      mockFetch({ ok: false, status: 529, statusText: 'Overloaded' });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderUnavailableError);
    });

    it('should return health status', async () => {
      mockFetch({}, {
        content: [{ text: 'ping' }],
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      const health = await provider.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return capabilities', () => {
      const caps = provider.getCapabilities();
      expect(caps.supportsStreaming).toBe(true);
      expect(caps.hasNoTrainingGuarantee).toBe(true);
      expect(caps.supportedModels).toContain('claude-sonnet-4-20250514');
    });

    it('should throw configuration error without API key', async () => {
      vi.mocked(getEnv).mockReturnValueOnce({ ANTHROPIC_API_KEY: undefined } as any);

      const providerNoKey = new AnthropicProvider();
      await expect(providerNoKey.generateCompletion('Hi')).rejects.toThrow(ProviderConfigurationError);
    });

    it('should stream completion chunks', async () => {
      mockStreamFetch([
        'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n',
        'data: {"type":"content_block_delta","delta":{"text":" world"}}\n',
        'data: [DONE]\n',
      ]);

      const chunks: string[] = [];
      for await (const chunk of provider.generateCompletionStream('Hi')) {
        if (!chunk.isFinal) chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });
  });

  describe('OpenAIProvider', () => {
    const provider = new OpenAIProvider('gpt-4o', 4096, 30000);

    it('should generate completion successfully', async () => {
      mockFetch({}, {
        choices: [{ message: { content: 'Hello from GPT' } }],
        usage: { prompt_tokens: 15, completion_tokens: 25 },
        model: 'gpt-4o',
      });

      const result = await provider.generateCompletion('Hi', 'Be concise');

      expect(result.content).toBe('Hello from GPT');
      expect(result.inputTokens).toBe(15);
      expect(result.outputTokens).toBe(25);
      expect(result.modelId).toBe('gpt-4o');
    });

    it('should handle empty response', async () => {
      mockFetch({}, {
        choices: [],
        usage: {},
        model: 'gpt-4o',
      });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderInvalidResponseError);
    });

    it('should handle 400 context length error', async () => {
      mockFetch({ ok: false, status: 400, statusText: 'Bad Request' }, {
        error: { message: 'context_length_exceeded', code: 'context_length_exceeded' },
      });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderUnavailableError);
    });

    it('should handle 401 error', async () => {
      mockFetch({ ok: false, status: 401, statusText: 'Unauthorized' });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should return health status', async () => {
      mockFetch({}, { data: [{ id: 'gpt-4o' }] });

      const health = await provider.healthCheck();
      expect(health.healthy).toBe(true);
    });

    it('should return capabilities', () => {
      const caps = provider.getCapabilities();
      expect(caps.supportsStreaming).toBe(true);
      expect(caps.hasNoTrainingGuarantee).toBe(false);
      expect(caps.supportedModels).toContain('gpt-4o');
    });

    it('should stream completion chunks', async () => {
      mockStreamFetch([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: [DONE]\n',
      ]);

      const chunks: string[] = [];
      for await (const chunk of provider.generateCompletionStream('Hi')) {
        if (!chunk.isFinal) chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });
  });

  describe('MistralProvider', () => {
    const provider = new MistralProvider('mistral-large-latest', 4096, 30000);

    it('should generate completion successfully', async () => {
      mockFetch({}, {
        choices: [{ message: { content: 'Hello from Mistral' } }],
        usage: { prompt_tokens: 8, completion_tokens: 16 },
        model: 'mistral-large-latest',
      });

      const result = await provider.generateCompletion('Hi', 'Be helpful');

      expect(result.content).toBe('Hello from Mistral');
      expect(result.inputTokens).toBe(8);
      expect(result.outputTokens).toBe(16);
      expect(result.modelId).toBe('mistral-large-latest');
    });

    it('should handle 500 error', async () => {
      mockFetch({ ok: false, status: 500, statusText: 'Internal Server Error' });

      await expect(provider.generateCompletion('Hi')).rejects.toThrow(ProviderUnavailableError);
    });

    it('should return health status', async () => {
      mockFetch({}, { data: [{ id: 'mistral-large-latest' }] });

      const health = await provider.healthCheck();
      expect(health.healthy).toBe(true);
    });

    it('should return capabilities with EU data residency', () => {
      const caps = provider.getCapabilities();
      expect(caps.dataResidency).toBe('EU');
      expect(caps.hasNoTrainingGuarantee).toBe(true);
      expect(caps.supportedModels).toContain('mistral-large-latest');
    });

    it('should stream completion chunks', async () => {
      mockStreamFetch([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: [DONE]\n',
      ]);

      const chunks: string[] = [];
      for await (const chunk of provider.generateCompletionStream('Hi')) {
        if (!chunk.isFinal) chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });
  });

  describe('Cleanup provider on missing API key', () => {
    it('OpenAI should throw configuration error without API key', async () => {
      vi.mocked(getEnv).mockReturnValue({ OPENAI_API_KEY: undefined } as any);

      const providerNoKey = new OpenAIProvider();
      await expect(providerNoKey.generateCompletion('Hi')).rejects.toThrow(ProviderConfigurationError);
    });

    it('Mistral should throw configuration error without API key', async () => {
      vi.mocked(getEnv).mockReturnValue({ MISTRAL_API_KEY: undefined } as any);

      const providerNoKey = new MistralProvider();
      await expect(providerNoKey.generateCompletion('Hi')).rejects.toThrow(ProviderConfigurationError);
    });
  });
});
