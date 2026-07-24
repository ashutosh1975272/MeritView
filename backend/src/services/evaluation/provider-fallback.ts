import { ProviderRegistry } from '../../providers/registry';
import { LLMProvider } from '../../providers/llm';
import { logger } from '../../utils/logger';

const FALLBACK_CHAINS: Record<string, string[]> = {
  'groq-llama': ['groq-mixtral', 'gemini-pro'],
  'groq-mixtral': ['groq-llama', 'gemini-pro'],
  'gemini-pro': ['groq-llama', 'groq-mixtral'],
};

export async function dispatchWithFallback(
  registry: ProviderRegistry,
  primaryKey: string,
  prompt: string,
  options?: Parameters<LLMProvider['generateCompletion']>[1]
): Promise<{ providerKey: string; result: any } | null> {
  const chain = [primaryKey, ...(FALLBACK_CHAINS[primaryKey] || [])];
  const seen = new Set<string>();

  for (const key of chain) {
    if (seen.has(key)) continue;
    seen.add(key);

    const entry = registry.getEntry(key);
    if (!entry || !entry.isEnabled) {
      logger.debug(`Fallback: provider ${key} not available`);
      continue;
    }

    if (entry.circuitBreaker.getState() === 'OPEN') {
      logger.warn(`Fallback: circuit breaker OPEN for ${key}`);
      continue;
    }

    try {
      const result = await entry.circuitBreaker.execute(async () => {
        return entry.provider.generateCompletion(prompt, options);
      });
      logger.info(`Fallback: succeeded with ${key}`);
      return { providerKey: key, result };
    } catch (error: any) {
      logger.warn(`Fallback: ${key} failed`, { error: error.message });
    }
  }

  logger.error(`Fallback: all providers exhausted for chain starting with ${primaryKey}`);
  return null;
}
