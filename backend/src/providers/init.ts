import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { providerRegistry } from './registry';
import { FallbackProvider } from './fallback.provider';
import { GroqProvider } from './groq.provider';
import { GeminiProvider } from './gemini.provider';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAIProvider } from './openai.provider';
import { MistralProvider } from './mistral.provider';
import { TogetherProvider } from './together.provider';
import { NvidiaProvider } from './nvidia.provider';

export function initializeProviders(): void {
  const env = getEnv();

  if (env.ANTHROPIC_API_KEY) {
    providerRegistry.register(new AnthropicProvider());
    logger.info('Anthropic provider registered');
  }

  if (env.OPENAI_API_KEY) {
    providerRegistry.register(new OpenAIProvider());
    logger.info('OpenAI provider registered');
  }

  if (env.MISTRAL_API_KEY) {
    providerRegistry.register(new MistralProvider());
    logger.info('Mistral provider registered');
  }

  if (env.GROQ_API_KEY) {
    providerRegistry.register(new GroqProvider());
    logger.info('Groq provider registered');
  }

  if (env.GEMINI_API_KEY) {
    providerRegistry.register(new GeminiProvider());
    logger.info('Gemini provider registered');
  }

  if (env.TOGETHER_API_KEY) {
    providerRegistry.register(new TogetherProvider());
    logger.info('Together AI provider registered');
  }

  if (env.NVIDIA_API_KEY) {
    providerRegistry.register(new NvidiaProvider());
    logger.info('NVIDIA provider registered');
  }

  providerRegistry.register(new FallbackProvider());
  logger.info('Fallback provider registered as last resort');

  logger.info(`Provider registry initialized with ${providerRegistry.size} provider(s): ${providerRegistry.getNames().join(', ')}`);
}
