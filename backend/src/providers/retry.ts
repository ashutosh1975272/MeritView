import { ProviderError, ProviderTimeoutError } from './errors';

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

export function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return attempt(0);

  async function attempt(attemptNumber: number): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ProviderError) {
        if (!error.recoverable) {
          throw error;
        }
      }

      if (attemptNumber >= opts.maxAttempts - 1) {
        throw error;
      }

      const delay = calculateDelay(attemptNumber, opts);

      await sleep(delay);

      return attempt(attemptNumber + 1);
    }
  }
}

function calculateDelay(attemptNumber: number, opts: RetryOptions): number {
  const exponentialDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attemptNumber);
  const cappedDelay = Math.min(exponentialDelay, opts.maxDelayMs);

  if (opts.jitter) {
    const jitter = Math.random() * 0.5 * cappedDelay;
    return cappedDelay + jitter;
  }

  return cappedDelay;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ProviderTimeoutError('unknown', timeoutMs, message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
