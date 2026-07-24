import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderRegistry } from '../../providers/registry';
import { LLMProvider, ProviderCapabilities } from '../../providers/llm';
import { PromptCompletionResult, HealthStatus } from '../../providers/types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

function createMockProvider(name: string, modelId: string): LLMProvider {
  return {
    name,
    modelId,
    capabilities: {
      supportsStreaming: false,
      maxContextTokens: 8192,
      supportsJsonMode: true,
      hasTrainingGuarantee: true,
      dataResidencyRegion: 'US',
    } as ProviderCapabilities,
    generateCompletion: vi.fn().mockResolvedValue({
      id: `comp_${name}_123`,
      provider: name,
      modelId,
      content: '{"result": "ok"}',
      finishReason: 'stop',
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 500,
      costUsd: 0.001,
      timestamp: new Date(),
      parseSuccess: true,
      attemptNumber: 1,
    } as PromptCompletionResult),
    healthCheck: vi.fn().mockResolvedValue({
      healthy: true,
      latencyMs: 100,
      lastChecked: new Date(),
    } as HealthStatus),
    estimateCost: vi.fn().mockReturnValue({
      estimatedUsd: 0.001,
      inputTokens: 100,
      outputTokens: 50,
      model: `${name}/${modelId}`,
    }),
  };
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ProviderRegistry();
  });

  describe('register and get', () => {
    it('should register a provider and retrieve it', () => {
      const mockProvider = createMockProvider('groq', 'llama-3-70b');
      registry.register('groq-llama', mockProvider);

      const retrieved = registry.get('groq-llama');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('groq');
    });

    it('should return undefined for unregistered key', () => {
      const retrieved = registry.get('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for disabled provider', () => {
      const mockProvider = createMockProvider('groq', 'llama-3-70b');
      registry.register('groq-llama', mockProvider);
      registry.setEnabled('groq-llama', false);

      const retrieved = registry.get('groq-llama');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('should remove a provider', () => {
      const mockProvider = createMockProvider('groq', 'llama-3-70b');
      registry.register('groq-llama', mockProvider);
      registry.unregister('groq-llama');

      expect(registry.get('groq-llama')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered providers', () => {
      const p1 = createMockProvider('groq', 'llama-3-70b');
      const p2 = createMockProvider('gemini', 'gemini-pro');
      registry.register('groq-llama', p1);
      registry.register('gemini-pro', p2);

      const all = registry.getAll();
      expect(all.size).toBe(2);
    });

    it('should exclude disabled providers', () => {
      const p1 = createMockProvider('groq', 'llama-3-70b');
      const p2 = createMockProvider('gemini', 'gemini-pro');
      registry.register('groq-llama', p1);
      registry.register('gemini-pro', p2);
      registry.setEnabled('groq-llama', false);

      const all = registry.getAll();
      expect(all.size).toBe(1);
      expect(all.has('gemini-pro')).toBe(true);
    });
  });

  describe('dispatch', () => {
    it('should dispatch to all providers in parallel', async () => {
      const p1 = createMockProvider('groq', 'llama-3-70b');
      const p2 = createMockProvider('gemini', 'gemini-pro');
      registry.register('groq-llama', p1);
      registry.register('gemini-pro', p2);

      const results = await registry.dispatch('test prompt', ['groq-llama', 'gemini-pro']);

      expect(results).toHaveLength(2);
      expect(results[0].parseSuccess).toBe(true);
      expect(results[1].parseSuccess).toBe(true);
    });

    it('should return only successful results', async () => {
      const p1 = createMockProvider('groq', 'llama-3-70b');
      const p2 = createMockProvider('gemini', 'gemini-pro');
      (p2.generateCompletion as any).mockRejectedValue(new Error('Provider error'));
      registry.register('groq-llama', p1);
      registry.register('gemini-pro', p2);

      const results = await registry.dispatch('test prompt', ['groq-llama', 'gemini-pro']);

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('groq');
    });

    it('should return empty array for unregistered provider', async () => {
      const results = await registry.dispatch('test', ['nonexistent']);
      expect(results).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return health from provider', async () => {
      const mockProvider = createMockProvider('groq', 'llama-3-70b');
      registry.register('groq-llama', mockProvider);

      const health = await registry.healthCheck('groq-llama');
      expect(health.healthy).toBe(true);
    });

    it('should return unhealthy for unregistered provider', async () => {
      const health = await registry.healthCheck('nonexistent');
      expect(health.healthy).toBe(false);
      expect(health.errorMessage).toContain('not registered');
    });
  });

  describe('setEnabled', () => {
    it('should toggle provider enabled state', () => {
      const mockProvider = createMockProvider('groq', 'llama-3-70b');
      registry.register('groq-llama', mockProvider);

      expect(registry.get('groq-llama')).toBeDefined();

      registry.setEnabled('groq-llama', false);
      expect(registry.get('groq-llama')).toBeUndefined();

      registry.setEnabled('groq-llama', true);
      expect(registry.get('groq-llama')).toBeDefined();
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker for a provider', () => {
      const mockProvider = createMockProvider('groq', 'llama-3-70b');
      registry.register('groq-llama', mockProvider);

      expect(() => registry.resetCircuitBreaker('groq-llama')).not.toThrow();
    });

    it('should not throw for unregistered provider', () => {
      expect(() => registry.resetCircuitBreaker('nonexistent')).not.toThrow();
    });
  });
});
