import { LLMProvider } from './llm';
import { PromptCompletionResult, HealthStatus } from './types';
import { ProviderUnavailableError } from './errors';
import { CircuitBreaker } from './circuit-breaker';

export interface ProviderEntry {
  provider: LLMProvider;
  circuitBreaker: CircuitBreaker;
  isEnabled: boolean;
}

export class ProviderRegistry {
  private providers: Map<string, ProviderEntry> = new Map();

  register(key: string, provider: LLMProvider, options?: { circuitBreakerConfig?: { failureThreshold: number; resetTimeoutMs: number } }): void {
    const circuitBreaker = new CircuitBreaker(key, options?.circuitBreakerConfig);
    this.providers.set(key, { provider, circuitBreaker, isEnabled: true });
  }

  unregister(key: string): void {
    this.providers.delete(key);
  }

  get(key: string): LLMProvider | undefined {
    const entry = this.providers.get(key);
    return entry?.isEnabled ? entry.provider : undefined;
  }

  getAll(): Map<string, LLMProvider> {
    const result = new Map<string, LLMProvider>();
    for (const [key, entry] of this.providers) {
      if (entry.isEnabled) {
        result.set(key, entry.provider);
      }
    }
    return result;
  }

  async dispatch(prompt: string, providerKeys: string[], options?: Parameters<LLMProvider['generateCompletion']>[1]): Promise<PromptCompletionResult[]> {
    const promises = providerKeys.map(async (key) => {
      const entry = this.providers.get(key);
      if (!entry) {
        throw new ProviderUnavailableError(key, `Provider ${key} not registered`);
      }

      return entry.circuitBreaker.execute(async () => {
        return entry.provider.generateCompletion(prompt, options);
      });
    });

    return Promise.allSettled(promises).then((results) => {
      const completed: PromptCompletionResult[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          completed.push(result.value);
        }
      }

      return completed;
    });
  }

  async healthCheck(key: string): Promise<HealthStatus> {
    const entry = this.providers.get(key);
    if (!entry) {
      return {
        healthy: false,
        lastChecked: new Date(),
        errorMessage: `Provider ${key} not registered`,
      };
    }

    return entry.provider.healthCheck();
  }

  getEntry(key: string): ProviderEntry | undefined {
    return this.providers.get(key);
  }

  setEnabled(key: string, enabled: boolean): void {
    const entry = this.providers.get(key);
    if (entry) {
      entry.isEnabled = enabled;
    }
  }

  resetCircuitBreaker(key: string): void {
    const entry = this.providers.get(key);
    if (entry) {
      entry.circuitBreaker.reset();
    }
  }
}
