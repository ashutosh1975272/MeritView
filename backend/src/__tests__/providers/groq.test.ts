import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroqProvider } from '../../providers/groq.provider';

vi.mock('groq-sdk', () => {
  const mockCreate = vi.fn();
  const MockGroq = vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
  (MockGroq as any).mockCreate = mockCreate;
  return { default: MockGroq };
});

vi.mock('../../providers/health', () => ({
  checkGroqHealth: vi.fn(),
}));

vi.mock('../../providers/cost', () => ({
  estimateCost: vi.fn().mockReturnValue(0.001),
  isOverCostThreshold: vi.fn().mockReturnValue(false),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

describe('GroqProvider', () => {
  let provider: GroqProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GroqProvider('llama-3-70b-8192', 'test-api-key');
  });

  describe('generateCompletion', () => {
    it('should return a completion result on success', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      (mockGroq as any).mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"test": "response"}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const result = await provider.generateCompletion('Test prompt');

      expect(result.provider).toBe('groq');
      expect(result.modelId).toBe('llama-3-70b-8192');
      expect(result.content).toBe('{"test": "response"}');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.parseSuccess).toBe(true);
      expect(result.costUsd).toBeGreaterThan(0);
    });

    it('should handle empty content response', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      (mockGroq as any).mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 0, completion_tokens: 0 },
      });

      const result = await provider.generateCompletion('Test prompt');

      expect(result.content).toBe('');
      expect(result.inputTokens).toBe(0);
      expect(result.parseSuccess).toBe(true);
    });

    it('should handle missing choices array', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      (mockGroq as any).mockCreate.mockResolvedValue({
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const result = await provider.generateCompletion('Test prompt');

      expect(result.content).toBe('');
      expect(result.finishReason).toBe('unknown');
    });

    it('should throw ProviderAuthenticationError on 401', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      const error = new Error('Invalid API key') as any;
      error.status = 401;
      (mockGroq as any).mockCreate.mockRejectedValue(error);

      const { ProviderAuthenticationError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should throw ProviderRateLimitError on 429', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      const error = new Error('Rate limited') as any;
      error.status = 429;
      (mockGroq as any).mockCreate.mockRejectedValue(error);

      const { ProviderRateLimitError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle provider error with status 413', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      const error = new Error('Prompt too large') as any;
      error.status = 413;
      (mockGroq as any).mockCreate.mockRejectedValue(error);

      const { ProviderError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderError);
    });

    it('should handle generic errors', async () => {
      const mockGroq = (await import('groq-sdk')).default;
      (mockGroq as any).mockCreate.mockRejectedValue(new Error('Network error'));

      const { ProviderError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderError);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const { checkGroqHealth } = await import('../../providers/health');
      (checkGroqHealth as any).mockResolvedValue({
        healthy: true,
        latencyMs: 150,
        lastChecked: new Date(),
      });

      const health = await provider.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBe(150);
      expect(checkGroqHealth).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('data residency', () => {
    it('should have US data residency', () => {
      expect(provider.capabilities.dataResidencyRegion).toBe('US');
    });
  });

  describe('training guarantee', () => {
    it('should have training guarantee true', () => {
      expect(provider.capabilities.hasTrainingGuarantee).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('should return cost estimate', () => {
      const cost = provider.estimateCost(1000, 500);
      expect(cost.model).toContain('groq');
      expect(cost.model).toContain('llama-3-70b-8192');
      expect(cost.estimatedUsd).toBeGreaterThanOrEqual(0);
    });
  });
});
