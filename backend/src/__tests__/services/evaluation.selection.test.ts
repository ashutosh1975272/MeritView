import { describe, it, expect, vi, beforeEach } from 'vitest';

const registryState = vi.hoisted(() => ({
  names: [] as string[],
  providers: {} as Record<string, any>,
}));

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    MIN_SUCCESSFUL_EVALUATIONS: 2,
  }),
}));

vi.mock('../../providers/registry', () => ({
  providerRegistry: {
    getNames: vi.fn(() => registryState.names),
    get: vi.fn((name: string) => registryState.providers[name]),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../jobs/queues', () => ({
  addEmailJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../aggregation/index', () => ({
  aggregateEvaluations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../db/prisma', () => ({
  prisma: {
    dispute: { findUnique: vi.fn(), update: vi.fn() },
    party: { findMany: vi.fn() },
    evaluatorOutput: { create: vi.fn() },
    payment: { findMany: vi.fn(), update: vi.fn() },
  },
}));

import { getEvaluatorProviders } from '../../services/evaluation';

function createProvider(name: string, healthy: boolean, models: string[]) {
  return {
    name,
    healthCheck: vi.fn().mockResolvedValue({
      healthy,
      latencyMs: 12,
      lastChecked: new Date(),
    }),
    getCapabilities: vi.fn().mockReturnValue({
      maxTokens: 8192,
      supportsStreaming: true,
      dataResidency: 'US',
      hasNoTrainingGuarantee: true,
      supportedModels: models,
    }),
    generateCompletion: vi.fn(),
    generateCompletionStream: vi.fn(),
  };
}

describe('evaluation provider selection', () => {
  beforeEach(() => {
    registryState.names = [];
    registryState.providers = {};
    vi.clearAllMocks();
  });

  it('prefers healthy Groq first and keeps fallback last', async () => {
    registryState.names = ['openai', 'groq', 'fallback'];
    registryState.providers = {
      openai: createProvider('openai', true, ['gpt-4o']),
      groq: createProvider('groq', true, ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']),
      fallback: createProvider('fallback', true, ['fallback-local-v1']),
    };

    const providers = await getEvaluatorProviders();

    expect(providers.map((p) => p.name)).toEqual(['groq', 'openai', 'fallback']);
    expect(providers[0].modelId).toBe('llama-3.3-70b-versatile');
    expect(providers[1].modelId).toBe('gpt-4o');
    expect(providers[2].modelId).toBe('fallback-local-v1');
  });

  it('falls back to another healthy provider when Groq is unhealthy', async () => {
    registryState.names = ['openai', 'groq', 'fallback'];
    registryState.providers = {
      openai: createProvider('openai', true, ['gpt-4o']),
      groq: createProvider('groq', false, ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']),
      fallback: createProvider('fallback', true, ['fallback-local-v1']),
    };

    const providers = await getEvaluatorProviders();

    expect(providers.map((p) => p.name)).toEqual(['openai', 'fallback']);
    expect(providers[0].modelId).toBe('gpt-4o');
    expect(providers[1].modelId).toBe('fallback-local-v1');
  });
});
