import { create } from 'zustand';

interface PricingTier {
  tier: string;
  label: string;
  priceUsd: number;
  description: string;
  estimatedTurnaround: string;
  features: string[];
}

interface PricingStore {
  selectedTier: string | null;
  tiers: PricingTier[];
  setSelectedTier: (tier: string) => void;
  setTiers: (tiers: PricingTier[]) => void;
}

export const usePricingStore = create<PricingStore>((set) => ({
  selectedTier: 'STANDARD',
  tiers: [
    { tier: 'STANDARD', label: 'Standard Analysis', priceUsd: 99, description: 'Complete AI-powered dispute analysis', estimatedTurnaround: '24-48 hours', features: ['3-model evaluation', 'Comprehensive report', 'PDF download'] },
    { tier: 'EXPEDITED', label: 'Expedited Analysis', priceUsd: 199, description: 'Priority processing with faster turnaround', estimatedTurnaround: '12-24 hours', features: ['All Standard features', 'Priority queue', '5-model evaluation'] },
    { tier: 'EXTENDED', label: 'Extended Analysis', priceUsd: 299, description: 'In-depth analysis with additional evaluator models', estimatedTurnaround: '24-48 hours', features: ['All Expedited features', '5-model evaluation', 'Extended report'] },
    { tier: 'REANALYSIS', label: 'Re-analysis', priceUsd: 49, description: 'Re-evaluate an existing dispute', estimatedTurnaround: '24-48 hours', features: ['Updated analysis', 'Comparison report'] },
  ],
  setSelectedTier: (tier) => set({ selectedTier: tier }),
  setTiers: (tiers) => set({ tiers }),
}));
