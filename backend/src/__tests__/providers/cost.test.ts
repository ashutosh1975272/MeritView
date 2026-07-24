import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost, isOverCostThreshold, getTargetCostPerDispute } from '../../providers/cost';

describe('Provider Cost Utils', () => {
  describe('estimateCost', () => {
    it('returns 0 for unknown model/provider', () => {
      expect(estimateCost({ inputTokens: 100, outputTokens: 100, modelId: 'unknown', provider: 'unknown' })).toBe(0);
    });

    it('computes cost for groq llama-3-70b-8192', () => {
      const cost = estimateCost({ inputTokens: 1000, outputTokens: 1000, modelId: 'llama-3-70b-8192', provider: 'groq' });
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeCloseTo(0.00138, 2);
    });

    it('computes cost for groq mixtral-8x7b-32768', () => {
      const cost = estimateCost({ inputTokens: 1000, outputTokens: 1000, modelId: 'mixtral-8x7b-32768', provider: 'groq' });
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeCloseTo(0.00053, 2);
    });

    it('computes cost for gemini-1.5-pro', () => {
      const cost = estimateCost({ inputTokens: 1000, outputTokens: 1000, modelId: 'gemini-1.5-pro', provider: 'gemini' });
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeCloseTo(0.00625, 2);
    });

    it('is zero when no tokens used', () => {
      expect(estimateCost({ inputTokens: 0, outputTokens: 0, modelId: 'llama-3-70b-8192', provider: 'groq' })).toBe(0);
    });
  });

  describe('isOverCostThreshold', () => {
    it('returns false for cost at threshold', () => {
      expect(isOverCostThreshold(15.0)).toBe(false);
    });

    it('returns true for cost above threshold', () => {
      expect(isOverCostThreshold(15.01)).toBe(true);
    });

    it('returns false for cost below threshold', () => {
      expect(isOverCostThreshold(10.0)).toBe(false);
    });
  });

  describe('getTargetCostPerDispute', () => {
    it('returns positive number', () => {
      expect(getTargetCostPerDispute()).toBeGreaterThan(0);
    });

    it('returns the expected value', () => {
      expect(getTargetCostPerDispute()).toBe(8.30);
    });
  });
});
