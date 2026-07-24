export interface ModelPricing {
  modelId: string;
  provider: string;
  inputTokenPricePer1k: number;
  outputTokenPricePer1k: number;
  currency: string;
}

export interface CostEstimateInput {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  provider: string;
}

const MODEL_PRICING: ModelPricing[] = [
  {
    modelId: 'llama-3-70b-8192',
    provider: 'groq',
    inputTokenPricePer1k: 0.00059,
    outputTokenPricePer1k: 0.00079,
    currency: 'USD',
  },
  {
    modelId: 'mixtral-8x7b-32768',
    provider: 'groq',
    inputTokenPricePer1k: 0.00024,
    outputTokenPricePer1k: 0.00029,
    currency: 'USD',
  },
  {
    modelId: 'gemini-1.5-pro',
    provider: 'gemini',
    inputTokenPricePer1k: 0.00125,
    outputTokenPricePer1k: 0.00500,
    currency: 'USD',
  },
];

const COST_ALERT_THRESHOLD_USD = 15.0;
const TARGET_COST_PER_DISPUTE_USD = 8.30;

export function estimateCost(input: CostEstimateInput): number {
  const pricing = MODEL_PRICING.find(
    p => p.provider === input.provider && p.modelId === input.modelId
  );

  if (!pricing) {
    return 0;
  }

  const inputCost = (input.inputTokens / 1000) * pricing.inputTokenPricePer1k;
  const outputCost = (input.outputTokens / 1000) * pricing.outputTokenPricePer1k;

  return parseFloat((inputCost + outputCost).toFixed(8));
}

export function isOverCostThreshold(costUsd: number): boolean {
  return costUsd > COST_ALERT_THRESHOLD_USD;
}

export function getTargetCostPerDispute(): number {
  return TARGET_COST_PER_DISPUTE_USD;
}
