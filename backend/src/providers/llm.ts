export interface CompletionChunk {
  content: string;
  isFinal: boolean;
  inputTokens?: number;
  outputTokens?: number;
  modelId?: string;
}

export interface LLMProvider {
  name: string;
  generateCompletion(prompt: string, systemPrompt?: string): Promise<CompletionResult>;
  generateCompletionStream(prompt: string, systemPrompt?: string): AsyncIterable<CompletionChunk>;
  healthCheck(): Promise<HealthStatus>;
  getCapabilities(): ProviderCapabilities;
}

export interface CompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  modelId: string;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  lastChecked: Date;
  error?: string;
  warning?: string;
}

export interface ProviderCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  dataResidency: string;
  hasNoTrainingGuarantee: boolean;
  supportedModels: string[];
}
