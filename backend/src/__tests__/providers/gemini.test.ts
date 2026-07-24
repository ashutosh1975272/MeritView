import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../../providers/gemini.provider';

vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  const MockGoogleAI = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));
  (MockGoogleAI as any).mockGenerateContent = mockGenerateContent;
  (MockGoogleAI as any).mockGetGenerativeModel = mockGetGenerativeModel;
  return { GoogleGenerativeAI: MockGoogleAI };
});

vi.mock('../../providers/health', () => ({
  checkGeminiHealth: vi.fn(),
}));

vi.mock('../../providers/cost', () => ({
  estimateCost: vi.fn().mockReturnValue(0.005),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiProvider('gemini-1.5-pro', 'test-api-key');
  });

  describe('generateCompletion', () => {
    it('should return a completion result on success', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const mockResponse = {
        response: {
          text: () => '{"test": "gemini response"}',
        },
      };
      (GoogleGenerativeAI as any).mockGenerateContent.mockResolvedValue(mockResponse);
      (mockResponse as any).usageMetadata = {
        promptTokenCount: 200,
        candidatesTokenCount: 100,
      };

      const result = await provider.generateCompletion('Test prompt');

      expect(result.provider).toBe('gemini');
      expect(result.modelId).toBe('gemini-1.5-pro');
      expect(result.content).toBe('{"test": "gemini response"}');
      expect(result.inputTokens).toBe(200);
      expect(result.outputTokens).toBe(100);
      expect(result.parseSuccess).toBe(true);
    });

    it('should handle empty content', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const mockResponse = {
        response: {
          text: () => '',
        },
      };
      (GoogleGenerativeAI as any).mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.generateCompletion('Test prompt');

      expect(result.content).toBe('');
      expect(result.inputTokens).toBe(0);
    });

    it('should throw ProviderAuthenticationError on auth failure', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      (GoogleGenerativeAI as any).mockGenerateContent.mockRejectedValue(new Error('API key not valid'));

      const { ProviderAuthenticationError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should throw ProviderRateLimitError on 429', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      (GoogleGenerativeAI as any).mockGenerateContent.mockRejectedValue(new Error('429 Too Many Requests'));

      const { ProviderRateLimitError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderRateLimitError);
    });

    it('should throw ProviderRateLimitError on RESOURCE_EXHAUSTED', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      (GoogleGenerativeAI as any).mockGenerateContent.mockRejectedValue(new Error('RESOURCE_EXHAUSTED'));

      const { ProviderRateLimitError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderRateLimitError);
    });

    it('should throw ProviderError on generic failure', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      (GoogleGenerativeAI as any).mockGenerateContent.mockRejectedValue(new Error('Service unavailable'));

      const { ProviderError } = await import('../../providers/errors');

      await expect(provider.generateCompletion('prompt')).rejects.toThrow(ProviderError);
    });
  });

  describe('healthCheck', () => {
    it('should return health status with latency', async () => {
      const { checkGeminiHealth } = await import('../../providers/health');
      (checkGeminiHealth as any).mockResolvedValue({
        healthy: true,
        latencyMs: 200,
        lastChecked: new Date(),
      });

      const health = await provider.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBe(200);
      expect(checkGeminiHealth).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('data residency', () => {
    it('should have global data residency', () => {
      expect(provider.capabilities.dataResidencyRegion).toBe('global');
    });
  });

  describe('training guarantee', () => {
    it('should have training guarantee false', () => {
      expect(provider.capabilities.hasTrainingGuarantee).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('should return cost estimate', () => {
      const cost = provider.estimateCost(1000, 500);
      expect(cost.model).toContain('gemini');
      expect(cost.model).toContain('gemini-1.5-pro');
      expect(cost.estimatedUsd).toBeGreaterThanOrEqual(0);
    });
  });
});
