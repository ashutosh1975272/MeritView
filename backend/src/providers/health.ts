import { LLMProvider, HealthStatus } from './llm.js';
import { logger } from '../utils/logger.js';

export interface HealthCheckResult {
  provider: string;
  status: HealthStatus;
}

export async function checkProviderHealth(provider: LLMProvider): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const status = await provider.healthCheck();
    return {
      provider: provider.name,
      status: {
        ...status,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
      },
    };
  } catch (error) {
    return {
      provider: provider.name,
      status: {
        healthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function checkAllProviders(
  providers: LLMProvider[]
): Promise<HealthCheckResult[]> {
  const results = await Promise.allSettled(
    providers.map((p) => checkProviderHealth(p))
  );

  return results.map((r) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    return {
      provider: 'unknown',
      status: {
        healthy: false,
        latencyMs: 0,
        lastChecked: new Date(),
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      },
    };
  });
}

export function isProviderHealthy(healthResult: HealthCheckResult): boolean {
  return healthResult.status.healthy;
}

export function getHealthyProviders(
  results: HealthCheckResult[]
): string[] {
  return results
    .filter((r) => isProviderHealthy(r))
    .map((r) => r.provider);
}

export function logHealthSummary(results: HealthCheckResult[]): void {
  const healthyCount = results.filter((r) => isProviderHealthy(r)).length;
  const totalCount = results.length;

  logger.info(
    `Provider health summary: ${healthyCount}/${totalCount} healthy`,
    { results: results.map((r) => ({ provider: r.provider, healthy: r.status.healthy, latencyMs: r.status.latencyMs })) }
  );

  for (const result of results) {
    if (!result.status.healthy) {
      logger.error(
        `Provider "${result.provider}" is unhealthy`,
        undefined,
        { error: result.status.error, latencyMs: result.status.latencyMs }
      );
    }
  }
}
