export interface PromptCompletionResult {
  id: string;
  provider: string;
  modelId: string;
  content: string;
  finishReason: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  timestamp: Date;
  parseSuccess: boolean;
  parseErrors?: string[];
  rawOutput?: string;
  structuredOutput?: Record<string, unknown>;
  attemptNumber: number;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs?: number;
  lastChecked: Date;
  errorMessage?: string;
}

export interface CostEstimate {
  estimatedUsd: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}
