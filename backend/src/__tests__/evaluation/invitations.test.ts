import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRICING_TIERS, getPriceForTier, getAllPricingTiers } from '../../services/payments/pricing';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('PricingTiers', () => {
  it('should have correct pricing for all tiers', () => {
    expect(PRICING_TIERS.STANDARD.priceUsd).toBe(99);
    expect(PRICING_TIERS.EXPEDITED.priceUsd).toBe(199);
    expect(PRICING_TIERS.EXTENDED.priceUsd).toBe(299);
    expect(PRICING_TIERS.REANALYSIS.priceUsd).toBe(49);
  });

  it('should return correct price for tier', () => {
    expect(getPriceForTier('STANDARD')).toBe(99);
    expect(getPriceForTier('EXPEDITED')).toBe(199);
    expect(getPriceForTier('INVALID')).toBe(99);
  });

  it('should return all pricing tiers', () => {
    const tiers = getAllPricingTiers();
    expect(tiers).toHaveLength(4);
  });

  it('should have descriptions for all tiers', () => {
    for (const tier of Object.values(PRICING_TIERS)) {
      expect(tier.description).toBeTruthy();
      expect(tier.features.length).toBeGreaterThan(0);
    }
  });
});

describe('BRIEF_TEMPLATE_SECTIONS', () => {
  it('should have exactly 5 sections', async () => {
    const { BRIEF_TEMPLATE_SECTIONS } = await import('../../services/brief-prep/template');
    expect(BRIEF_TEMPLATE_SECTIONS).toHaveLength(5);
    const sectionIds = BRIEF_TEMPLATE_SECTIONS.map(s => s.id);
    expect(sectionIds).toContain('statement_of_facts');
    expect(sectionIds).toContain('legal_arguments');
    expect(sectionIds).toContain('evidence_summary');
    expect(sectionIds).toContain('requested_outcome');
    expect(sectionIds).toContain('supporting_documents');
  });
});
