export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: PromptMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CostEstimate {
  provider: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  totalCostUsd: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EvaluationOutput {
  id?: string;
  disputeId: string;
  llmProvider: string;
  modelId: string;
  promptVersion: string;
  structuredOutput: Record<string, unknown>;
  rawOutput?: string;
  parseSuccess: boolean;
  parseErrors?: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  attemptNumber: number;
}

export interface DispatchResult {
  provider: string;
  success: boolean;
  output?: EvaluationOutput;
  error?: string;
  attemptNumber: number;
}
