import { LLMProvider, ProviderCapabilities } from './llm';
import { PromptCompletionResult, HealthStatus } from './types';
import { ProviderAuthenticationError, ProviderError } from './errors';

export function createOpenRouterProvider(apiKey: string): LLMProvider {
  return {
    name: 'openrouter',
    modelId: 'openrouter-auto',
    capabilities: new ProviderCapabilities(true, true, false, true, 128000),

    async generateCompletion(prompt: string, options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }): Promise<PromptCompletionResult> {
      const body: any = {
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature || 0.1,
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://meritview.app',
          'X-Title': 'MeritView',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        if (response.status === 401) throw new ProviderAuthenticationError('OpenRouter authentication failed');
        throw new ProviderError(`OpenRouter API error: ${bodyText}`, response.status);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        id: data.id,
        content,
        modelId: data.model || 'openrouter-auto',
        provider: 'openrouter',
        parseSuccess: true,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        costUsd: 0,
        structuredOutput: undefined,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { healthy: response.ok, lastChecked: new Date(), errorMessage: response.ok ? undefined : 'Health check failed' };
      } catch (error: any) {
        return { healthy: false, lastChecked: new Date(), errorMessage: error.message };
      }
    },
  };
}
