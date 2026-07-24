import { LLMProvider, ProviderCapabilities } from './llm';
import { PromptCompletionResult, HealthStatus } from './types';
import { ProviderAuthenticationError, ProviderError } from './errors';
import { estimateCost } from './cost';

export function createGPT4Provider(apiKey: string): LLMProvider {
  return {
    name: 'openai',
    modelId: 'gpt-4-turbo',
    capabilities: new ProviderCapabilities(true, true, false, true, 128000),

    async generateCompletion(prompt: string, options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }): Promise<PromptCompletionResult> {
      const body: any = {
        model: 'gpt-4-turbo-2024-04-09',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature || 0.1,
      };

      if (options?.jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        if (response.status === 401) throw new ProviderAuthenticationError('OpenAI authentication failed');
        throw new ProviderError(`OpenAI API error: ${bodyText}`, response.status);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      let structuredOutput: Record<string, unknown> | undefined;
      let parseSuccess = true;
      if (options?.jsonMode) {
        try {
          structuredOutput = JSON.parse(content);
        } catch {
          parseSuccess = false;
        }
      }

      return {
        id: data.id,
        content,
        modelId: 'gpt-4-turbo-2024-04-09',
        provider: 'openai',
        parseSuccess,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        costUsd: estimateCost({
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          modelId: 'gpt-4-turbo',
          provider: 'openai',
        }),
        structuredOutput,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { healthy: response.ok, lastChecked: new Date(), errorMessage: response.ok ? undefined : 'Health check failed' };
      } catch (error: any) {
        return { healthy: false, lastChecked: new Date(), errorMessage: error.message };
      }
    },
  };
}
