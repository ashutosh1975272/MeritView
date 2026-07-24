import { PromptCompletionResult, HealthStatus, CostEstimate } from './types';

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  maxContextTokens: number;
  supportsJsonMode: boolean;
  hasTrainingGuarantee: boolean;
  dataResidencyRegion: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly modelId: string;
  readonly capabilities: ProviderCapabilities;

  generateCompletion(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    }
  ): Promise<PromptCompletionResult>;

  healthCheck(): Promise<HealthStatus>;

  estimateCost(inputTokens: number, outputTokens: number): CostEstimate;
}
