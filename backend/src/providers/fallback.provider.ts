import { LLMProvider, CompletionResult, CompletionChunk, HealthStatus, ProviderCapabilities } from './llm.js';
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderConfigurationError,
  CircuitBreakerOpenError,
} from './errors.js';
import { providerRegistry } from './registry.js';
import { logger } from '../utils/logger.js';

export class FallbackProvider implements LLMProvider {
  readonly name = 'fallback';

  private getWorkingProviders(): { name: string; provider: LLMProvider }[] {
    const working: { name: string; provider: LLMProvider }[] = [];
    const names = providerRegistry.getNames();
    for (const name of names) {
      if (name === 'fallback') continue;
      try {
        const provider = providerRegistry.get(name);
        const cb = providerRegistry.getCircuitBreaker(name);
        if (!cb.isOpen()) {
          working.push({ name, provider });
        }
      } catch {
        // skip providers that error on access
      }
    }
    return working;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    const working = this.getWorkingProviders();
    const errors: string[] = [];

    for (const { name, provider } of working) {
      try {
        const result = await providerRegistry.callWithCircuitBreaker(name, () =>
          provider.generateCompletion(prompt, systemPrompt)
        );
        logger.info('Fallback: used working provider', { provider: name, modelId: result.modelId });
        return {
          ...result,
          modelId: `${name}/${result.modelId}`,
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${name}: ${msg}`);
        logger.warn('Fallback: provider failed, trying next', { provider: name, error: msg });
      }
    }

    const msg = errors.length > 0
      ? `All providers failed: ${errors.join('; ')}`
      : 'No LLM providers configured';
    logger.warn('Fallback: no working provider, using local fallback', { reason: msg });

    const startTime = Date.now();
    const content = this.generateResponse(prompt, systemPrompt);
    return {
      content: `[Fallback response — ${msg}]\n\n${content}`,
      inputTokens: prompt.length / 4,
      outputTokens: content.length / 4,
      durationMs: Date.now() - startTime,
      modelId: 'fallback-local-v1',
    };
  }

  async *generateCompletionStream(prompt: string, systemPrompt?: string): AsyncIterable<CompletionChunk> {
    const working = this.getWorkingProviders();
    const errors: string[] = [];

    for (const { name, provider } of working) {
      try {
        const stream = providerRegistry.callWithCircuitBreaker(name, async () => {
          const gen = provider.generateCompletionStream(prompt, systemPrompt);
          const chunks: CompletionChunk[] = [];
          for await (const chunk of gen) {
            chunks.push(chunk);
          }
          return chunks;
        });
        const chunks = await stream;
        for (const chunk of chunks) {
          yield chunk;
        }
        return;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${name}: ${msg}`);
      }
    }

    const msg = errors.length > 0
      ? `All providers failed: ${errors.join('; ')}`
      : 'No LLM providers configured';
    const fullResponse = `[Fallback response — ${msg}]\n\n${this.generateResponse(prompt, systemPrompt)}`;
    const words = fullResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield { content: (i > 0 ? ' ' : '') + words[i], isFinal: false };
      await new Promise(r => setTimeout(r, 30));
    }
    yield { content: '', isFinal: true, modelId: 'fallback-local-v1' };
  }

  private generateResponse(prompt: string, systemPrompt?: string): string {
    const lastLine = prompt.split('\n').filter(l => l.trim()).pop() || '';
    const userContent = lastLine.replace(/^(User|AI):\s*/i, '').trim();

    if (/fact|background|what happened|event/i.test(userContent)) {
      return 'Thank you for sharing those details about what happened. To help structure this for your brief, could you clarify:\n\n1. When exactly did this occur?\n2. Who were the key people involved?\n3. Was there any written agreement or communication about this?';
    }
    if (/position|believe|think|should/i.test(userContent)) {
      return "I understand your position. Let's articulate that clearly for the brief. You're saying:\n\n- What outcome do you believe is correct?\n- Why do you believe this is the fair or legally correct outcome?\n- Is there a specific clause or principle you're relying on?";
    }
    if (/argument|reason|support|evidence/i.test(userContent)) {
      return 'Good, these supporting arguments are important. To strengthen them:\n\n1. Do you have documents or evidence that support this?\n2. Has there been a similar situation or precedent you can reference?\n3. How does this argument connect to the key facts?';
    }
    if (/oppos|other|their|they/i.test(userContent)) {
      return "That's a fair acknowledgment of the other side's perspective. For the brief, it's important to present their position accurately. Consider:\n\n1. What do you think their strongest argument will be?\n2. How might they interpret the key facts differently?\n3. Where is there common ground versus fundamental disagreement?";
    }
    if (/resolution|outcome|want|seek|remedy/i.test(userContent)) {
      return 'Thank you for outlining your desired resolution. To complete this section:\n\n1. What specific outcome are you seeking (monetary, performance, declaration)?\n2. Is there a specific amount or action you have in mind?\n3. Would you accept any alternative resolutions?';
    }

    return 'Thank you for that input. Could you provide more detail? Think about:\n\n- What specific facts support your position?\n- Is there documentation available?\n- What timeline are we working with?';
  }

  async healthCheck(): Promise<HealthStatus> {
    const working = this.getWorkingProviders();
    if (working.length > 0) {
      return { healthy: true, latencyMs: 0, lastChecked: new Date() };
    }
    return { healthy: true, latencyMs: 0, lastChecked: new Date(), warning: 'No real LLM providers configured, using local fallback' };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxTokens: 2000,
      supportsStreaming: true,
      dataResidency: 'local',
      hasNoTrainingGuarantee: true,
      supportedModels: ['fallback-local-v1'],
    };
  }
}
