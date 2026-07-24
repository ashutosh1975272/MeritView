import { LLMProvider, ProviderCapabilities } from './llm';
import { PromptCompletionResult, HealthStatus } from './types';
import { ProviderAuthenticationError, ProviderError } from './errors';

export function createNvidiaNimProvider(apiKey: string): LLMProvider {
  return {
    name: 'nvidia',
    modelId: 'llama-3.1-nemotron-70b',
    capabilities: new ProviderCapabilities(true, true, false, true, 128000),

    async generateCompletion(prompt: string, options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }): Promise<PromptCompletionResult> {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.1,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        if (response.status === 401) throw new ProviderAuthenticationError('NVIDIA NIM authentication failed');
        throw new ProviderError(`NVIDIA NIM API error: ${bodyText}`, response.status);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        id: data.id,
        content,
        modelId: 'nvidia/llama-3.1-nemotron-70b-instruct',
        provider: 'nvidia',
        parseSuccess: true,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        costUsd: 0,
        structuredOutput: undefined,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { healthy: response.ok, lastChecked: new Date(), errorMessage: response.ok ? undefined : 'Health check failed' };
      } catch (error: any) {
        return { healthy: false, lastChecked: new Date(), errorMessage: error.message };
      }
    },
  };
}
