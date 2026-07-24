import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderRegistry } from '../../providers/registry';
import { dispatchWithFallback } from '../../services/evaluation/provider-fallback';

vi.mock('../../config/env', () => ({
  getEnv: () => ({ NODE_ENV: 'test' }),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ProviderFallback', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
    const mockProvider = (name: string, modelId: string) => ({
      name,
      modelId,
      capabilities: { supportsJson: true, supportsStreaming: false, supportsFunctionCalling: false, supportsVision: true, maxContextTokens: 128000 },
      generateCompletion: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue({ healthy: true, lastChecked: new Date() }),
    });

    registry.register('groq-llama', mockProvider('groq', 'llama-3.3-70b-versatile'));
    registry.register('groq-mixtral', mockProvider('groq', 'llama-3.1-8b-instant'));
    registry.register('gemini-pro', mockProvider('gemini', 'gemini-2.0-flash'));
  });

  it('should try primary first', async () => {
    const entry = registry.getEntry('groq-llama')!;
    entry.provider.generateCompletion = vi.fn().mockResolvedValue({ id: '1', content: 'test' });

    const result = await dispatchWithFallback(registry, 'groq-llama', 'test prompt');
    expect(result).not.toBeNull();
    expect(result!.providerKey).toBe('groq-llama');
  });

  it('should fallback to next provider on failure', async () => {
    const primaryEntry = registry.getEntry('groq-llama')!;
    primaryEntry.provider.generateCompletion = vi.fn().mockRejectedValue(new Error('API error'));

    const fallbackEntry = registry.getEntry('groq-mixtral')!;
    fallbackEntry.provider.generateCompletion = vi.fn().mockResolvedValue({ id: '2', content: 'fallback response' });

    const result = await dispatchWithFallback(registry, 'groq-llama', 'test prompt');
    expect(result).not.toBeNull();
    expect(result!.providerKey).toBe('groq-mixtral');
  });

  it('should return null when all providers fail', async () => {
    for (const [key] of registry.getAll()) {
      const entry = registry.getEntry(key)!;
      entry.provider.generateCompletion = vi.fn().mockRejectedValue(new Error('API error'));
    }

    const result = await dispatchWithFallback(registry, 'groq-llama', 'test prompt');
    expect(result).toBeNull();
  });

  it('should skip providers with open circuit breaker', async () => {
    const primaryEntry = registry.getEntry('groq-llama')!;
    for (let i = 0; i < 10; i++) {
      try {
        await primaryEntry.circuitBreaker.execute(() => Promise.reject(new Error('fail')));
      } catch {}
    }
    expect(primaryEntry.circuitBreaker.getState()).toBe('OPEN');

    const entry = registry.getEntry('groq-mixtral')!;
    entry.provider.generateCompletion = vi.fn().mockResolvedValue({ id: '3', content: 'bypass open cb' });

    const result = await dispatchWithFallback(registry, 'groq-llama', 'test prompt');
    expect(result).not.toBeNull();
    expect(result!.providerKey).toBe('groq-mixtral');
  });
});
