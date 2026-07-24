export interface PricingTierInfo {
  tier: string;
  label: string;
  priceUsd: number;
  description: string;
  estimatedTurnaround: string;
  features: string[];
}

export const PRICING_TIERS: Record<string, PricingTierInfo> = {
  STANDARD: {
    tier: 'STANDARD',
    label: 'Standard Analysis',
    priceUsd: 99,
    description: 'Complete AI-powered dispute analysis with 3 evaluator models',
    estimatedTurnaround: '24-48 hours',
    features: [
      '3-model evaluation (Groq Llama, Groq Mixtral, Gemini)',
      'Comprehensive opinion report',
      'PDF download',
      'Standard support',
    ],
  },
  EXPEDITED: {
    tier: 'EXPEDITED',
    label: 'Expedited Analysis',
    priceUsd: 199,
    description: 'Priority processing with faster turnaround',
    estimatedTurnaround: '12-24 hours',
    features: [
      'All Standard features',
      'Priority queue placement',
      '5-model evaluation',
      'Priority support',
    ],
  },
  EXTENDED: {
    tier: 'EXTENDED',
    label: 'Extended Analysis',
    priceUsd: 299,
    description: 'In-depth analysis with additional evaluator models and detailed report',
    estimatedTurnaround: '24-48 hours',
    features: [
      'All Expedited features',
      '5-model evaluation (Claude, GPT-4, Gemini, OpenRouter, NVIDIA)',
      'Extended opinion report with deeper analysis',
      'Dedicated support',
    ],
  },
  REANALYSIS: {
    tier: 'REANALYSIS',
    label: 'Re-analysis',
    priceUsd: 49,
    description: 'Re-evaluate an existing dispute with updated information',
    estimatedTurnaround: '24-48 hours',
    features: [
      'Re-evaluation with updated context',
      'Updated opinion report',
      'Comparison with original analysis',
      'Standard support',
    ],
  },
};

export function getPricingTier(tier: string): PricingTierInfo | undefined {
  return PRICING_TIERS[tier];
}

export function getPriceForTier(tier: string): number {
  return PRICING_TIERS[tier]?.priceUsd || 99;
}

export function getAllPricingTiers(): PricingTierInfo[] {
  return Object.values(PRICING_TIERS);
}

export function getDefaultPricingTier(): string {
  return 'STANDARD';
}
