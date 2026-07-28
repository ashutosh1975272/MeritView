import { logger } from '../utils/logger.js';
import { CircuitBreakerOpenError } from './errors.js';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
  halfOpenTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastStateChangeTime = 0;

  constructor(
    public readonly name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 3,
      openTimeoutMs: 30000,
      halfOpenTimeoutMs: 10000,
    }
  ) {}

  getState(): CircuitState {
    this.tryTransition();
    return this.state;
  }

  isOpen(): boolean {
    this.tryTransition();
    return this.state === 'OPEN';
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    this.tryTransition();

    if (this.state === 'OPEN') {
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess(): void {
    this.tryTransition();

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.reset();
      }
      return;
    }

    this.reset();
  }

  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.trip();
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChangeTime = Date.now();
    logger.info(`Circuit breaker "${this.name}" closed`);
  }

  private trip(): void {
    this.state = 'OPEN';
    this.lastStateChangeTime = Date.now();
    logger.warn(`Circuit breaker "${this.name}" opened after ${this.failureCount} failures`);
  }

  private tryTransition(): void {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChangeTime;
      if (elapsed >= this.options.openTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        this.lastStateChangeTime = Date.now();
        logger.info(`Circuit breaker "${this.name}" half-open`);
      }
    }
  }

  resetState(): void {
    this.reset();
  }

  getMetrics(): { state: CircuitState; failureCount: number; successCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
