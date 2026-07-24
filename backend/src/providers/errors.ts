import { AppError } from '../utils/errors';

export class ProviderError extends AppError {
  public readonly provider: string;
  public readonly recoverable: boolean;

  constructor(
    provider: string,
    message: string,
    statusCode: number = 502,
    recoverable: boolean = true,
    details?: Record<string, unknown>
  ) {
    super('PROVIDER_ERROR', message, statusCode, true, details);
    this.name = 'ProviderError';
    this.provider = provider;
    this.recoverable = recoverable;
  }
}

export class ProviderTimeoutError extends ProviderError {
  public readonly timeoutMs: number;

  constructor(provider: string, timeoutMs: number, message?: string) {
    super(
      provider,
      message || `Provider ${provider} timed out after ${timeoutMs}ms`,
      504,
      true,
      { timeoutMs }
    );
    this.name = 'ProviderTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ProviderRateLimitError extends ProviderError {
  public readonly retryAfterMs: number;

  constructor(provider: string, retryAfterMs: number) {
    super(
      provider,
      `Provider ${provider} rate limited`,
      429,
      true,
      { retryAfterMs }
    );
    this.name = 'ProviderRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderParseError extends ProviderError {
  public readonly rawOutput: string;

  constructor(provider: string, rawOutput: string, message?: string) {
    super(
      provider,
      message || `Provider ${provider} returned unparseable output`,
      502,
      false,
      { rawOutputLength: rawOutput.length }
    );
    this.name = 'ProviderParseError';
    this.rawOutput = rawOutput;
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, message?: string) {
    super(
      provider,
      message || `Provider ${provider} is unavailable`,
      503,
      true
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(provider: string, message?: string) {
    super(
      provider,
      message || `Provider ${provider} authentication failed`,
      401,
      false
    );
    this.name = 'ProviderAuthenticationError';
  }
}

export class ProviderGuardrailError extends ProviderError {
  constructor(provider: string, message: string) {
    super(provider, message, 400, false);
    this.name = 'ProviderGuardrailError';
  }
}
