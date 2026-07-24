import { LLMProvider, ProviderCapabilities } from './llm';
import { PromptCompletionResult, HealthStatus } from './types';
import { ProviderAuthenticationError, ProviderError } from './errors';
import { estimateCost } from './cost';

export function createClaude35SonnetProvider(apiKey: string): LLMProvider {
  return {
    name: 'anthropic',
    modelId: 'claude-3.5-sonnet',
    capabilities: new ProviderCapabilities(true, true, false, true, 200000),

    async generateCompletion(prompt: string, options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }): Promise<PromptCompletionResult> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3.5-sonnet-20241022',
          max_tokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.1,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        if (response.status === 401) throw new ProviderAuthenticationError('Claude authentication failed');
        throw new ProviderError(`Claude API error: ${body}`, response.status);
      }

      const data = await response.json();
      const content = data.content[0]?.text || '';

      return {
        id: data.id,
        content,
        modelId: 'claude-3.5-sonnet-20241022',
        provider: 'anthropic',
        parseSuccess: true,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        costUsd: estimateCost({
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          modelId: 'claude-3.5-sonnet',
          provider: 'anthropic',
        }),
        structuredOutput: undefined,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3.5-sonnet-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        });
        return { healthy: response.ok, lastChecked: new Date(), errorMessage: response.ok ? undefined : 'Health check failed' };
      } catch (error: any) {
        return { healthy: false, lastChecked: new Date(), errorMessage: error.message };
      }
    },
  };
}
