import { logger } from '../utils/logger.js';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const defaultShouldRetry = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'isRetryable' in error) {
    return (error as { isRetryable: boolean }).isRetryable === true;
  }
  return false;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 30000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetry(error)) {
        break;
      }

      const delayMs = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200,
        maxDelayMs
      );

      if (onRetry) {
        onRetry(error, attempt, delayMs);
      } else {
        logger.warn(
          `Retry attempt ${attempt}/${maxAttempts} after ${delayMs}ms`,
          { error: error instanceof Error ? error.message : String(error) }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
