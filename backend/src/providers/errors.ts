export class ProviderError extends Error {
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(provider: string, message: string, statusCode?: number, isRetryable: boolean = false) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(provider: string, message: string = 'Authentication failed') {
    super(provider, message, 401, false);
    this.name = 'ProviderAuthenticationError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  public readonly retryAfter?: number;

  constructor(provider: string, message: string = 'Rate limited', retryAfter?: number) {
    super(provider, message, 429, true);
    this.name = 'ProviderRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(provider, `Request timed out after ${timeoutMs}ms`, 408, true);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, message: string = 'Service unavailable') {
    super(provider, message, 503, true);
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderInvalidResponseError extends ProviderError {
  constructor(provider: string, message: string = 'Invalid response from provider') {
    super(provider, message, 502, false);
    this.name = 'ProviderInvalidResponseError';
  }
}

export class CircuitBreakerOpenError extends ProviderError {
  constructor(provider: string) {
    super(provider, 'Circuit breaker is open', 503, false);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(provider: string, message: string = 'Provider not configured') {
    super(provider, message, 500, false);
    this.name = 'ProviderConfigurationError';
  }
}
