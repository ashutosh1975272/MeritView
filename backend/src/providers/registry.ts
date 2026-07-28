import { LLMProvider } from './llm.js';
import { ProviderConfigurationError } from './errors.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { logger } from '../utils/logger.js';

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  register(provider: LLMProvider, circuitBreakerOptions?: ConstructorParameters<typeof CircuitBreaker>[1]): void {
    this.providers.set(provider.name, provider);

    if (circuitBreakerOptions) {
      this.circuitBreakers.set(
        provider.name,
        new CircuitBreaker(provider.name, circuitBreakerOptions)
      );
    } else {
      this.circuitBreakers.set(
        provider.name,
        new CircuitBreaker(provider.name)
      );
    }

    logger.info(`Provider "${provider.name}" registered`);
  }

  get(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderConfigurationError(name, `Provider "${name}" not found`);
    }
    return provider;
  }

  getCircuitBreaker(name: string): CircuitBreaker {
    const cb = this.circuitBreakers.get(name);
    if (!cb) {
      throw new ProviderConfigurationError(name, `Circuit breaker for "${name}" not found`);
    }
    return cb;
  }

  getAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  getNames(): string[] {
    return Array.from(this.providers.keys());
  }

  async callWithCircuitBreaker<T>(providerName: string, fn: () => Promise<T>): Promise<T> {
    const cb = this.getCircuitBreaker(providerName);

    if (cb.isOpen()) {
      logger.warn(`Circuit breaker open for "${providerName}", skipping request`);
    }

    return cb.call(fn);
  }

  remove(name: string): boolean {
    this.providers.delete(name);
    this.circuitBreakers.delete(name);
    logger.info(`Provider "${name}" removed from registry`);
    return true;
  }

  clear(): void {
    this.providers.clear();
    this.circuitBreakers.clear();
    logger.info('Provider registry cleared');
  }

  get size(): number {
    return this.providers.size;
  }
}

export const providerRegistry = new ProviderRegistry();
