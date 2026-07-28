export interface ModelPricing {
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  currency: string;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Groq free-tier models
  'groq/llama-3.3-70b-versatile': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'groq/llama-3.1-8b-instant': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'groq/mixtral-8x7b-32768': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'groq/gemma2-9b-it': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'groq/deepseek-r1-distill-llama-70b': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'groq/llama-3.2-90b-vision-preview': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },

  // Gemini free-tier models
  'gemini/gemini-2.0-flash-exp': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'gemini/gemini-1.5-flash': {
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    currency: 'USD',
  },
  'gemini/gemini-1.5-pro': {
    inputCostPer1kTokens: 0.00125,
    outputCostPer1kTokens: 0.00500,
    currency: 'USD',
  },
};

const DEFAULT_PRICING: ModelPricing = {
  inputCostPer1kTokens: 0.00100,
  outputCostPer1kTokens: 0.00200,
  currency: 'USD',
};

export function getModelPricing(provider: string, modelId: string): ModelPricing {
  const key = `${provider.toLowerCase()}/${modelId.toLowerCase()}`;
  return MODEL_PRICING[key] || DEFAULT_PRICING;
}

export function estimateCost(
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(provider, modelId);
  const inputCost = (inputTokens / 1000) * pricing.inputCostPer1kTokens;
  const outputCost = (outputTokens / 1000) * pricing.outputCostPer1kTokens;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateDisputeCost(
  provider: string,
  modelId: string,
  briefWordCount: number
): { inputTokens: number; outputTokens: number; estimatedCost: number } {
  const inputTokens = estimateTokensFromText(`Brief: ${'word '.repeat(briefWordCount)}`.substring(0, briefWordCount * 7));
  const outputTokens = 2048;
  const estimatedCost = estimateCost(provider, modelId, inputTokens, outputTokens);

  return { inputTokens, outputTokens, estimatedCost };
}

export const COST_THRESHOLD_ALERT_USD = 15.00;
export const COST_TARGET_PER_DISPUTE_USD = 8.30;

export function isOverCostThreshold(totalCost: number): boolean {
  return totalCost > COST_THRESHOLD_ALERT_USD;
}
