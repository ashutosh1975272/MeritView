import { providerRegistry } from './registry.js';
import { LLMProvider } from './llm.js';
import { ProviderConfigurationError } from './errors.js';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface RoutedProvider {
  provider: LLMProvider;
  providerName: string;
  modelId: string;
}

const DEFAULT_ROUTES: Record<string, string> = {
  evaluation: 'groq/llama-3.3-70b-versatile',
  aggregation: 'gemini/gemini-1.5-pro',
  'brief-prep': 'groq/llama-3.1-8b-instant',
};

function envKeyForTask(task: string): string {
  return `${task.toUpperCase().replace(/-/g, '_')}_MODEL`;
}

export class ModelRouter {
  resolve(task: string): RoutedProvider {
    const envKey = envKeyForTask(task);
    const fullEnv = getEnv();
    const env = fullEnv as unknown as Record<string, string | undefined>;
    const value = env[envKey] || DEFAULT_ROUTES[task];

    if (!value) {
      throw new ProviderConfigurationError(
        'router',
        `No model route configured for task "${task}" and no default exists`
      );
    }

    const slashIndex = value.indexOf('/');
    if (slashIndex === -1) {
      throw new ProviderConfigurationError(
        'router',
        `Invalid model route format for task "${task}": "${value}". Expected "<provider>/<model-id>"`
      );
    }

    const providerName = value.substring(0, slashIndex);
    const modelId = value.substring(slashIndex + 1);

    const provider = providerRegistry.get(providerName);

    logger.debug(`Model router: task="${task}" → ${providerName}/${modelId}`);

    return { provider, providerName, modelId };
  }

  getDefaultRoute(task: string): string {
    return DEFAULT_ROUTES[task] || '';
  }

  setRoute(task: string, route: string): void {
    DEFAULT_ROUTES[task] = route;
  }
}

export const modelRouter = new ModelRouter();
