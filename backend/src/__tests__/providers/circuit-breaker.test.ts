import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from '../../providers/circuit-breaker';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    cb = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      successThreshold: 2,
      timeoutMs: 5000,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailureCount()).toBe(0);
    });
  });

  describe('opens on consecutive failures', () => {
    it('should transition to OPEN after failureThreshold failures', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Service error'));

      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow('Service error');
      }

      expect(cb.getState()).toBe('OPEN');
      expect(cb.getFailureCount()).toBe(3);
    });

    it('should throw circuit breaker OPEN error when OPEN', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Service error'));

      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow();
      }

      await expect(cb.execute(failingFn)).rejects.toThrow('Circuit breaker test-breaker is OPEN');
    });
  });

  describe('half-open after timeout', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      cb = new CircuitBreaker('test-breaker', {
        failureThreshold: 2,
        resetTimeoutMs: 50,
        successThreshold: 2,
        timeoutMs: 5000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('Service error'));

      for (let i = 0; i < 2; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow();
      }

      expect(cb.getState()).toBe('OPEN');

      await new Promise(resolve => setTimeout(resolve, 60));

      const successFn = vi.fn().mockResolvedValue('ok');
      await cb.execute(successFn);

      expect(cb.getState()).toBe('HALF_OPEN');
    });
  });

  describe('closes on success', () => {
    it('should transition from HALF_OPEN to CLOSED after successThreshold successes', async () => {
      cb = new CircuitBreaker('test-breaker', {
        failureThreshold: 2,
        resetTimeoutMs: 50,
        successThreshold: 2,
        timeoutMs: 5000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < 2; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow();
      }

      await new Promise(resolve => setTimeout(resolve, 60));

      const successFn = vi.fn().mockResolvedValue('success');
      const result1 = await cb.execute(successFn);
      expect(result1).toBe('success');
      expect(cb.getState()).toBe('HALF_OPEN');

      const result2 = await cb.execute(successFn);
      expect(result2).toBe('success');
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Service error'));

      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow();
      }

      expect(cb.getState()).toBe('OPEN');

      cb.reset();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailureCount()).toBe(0);
    });
  });

  describe('success resets failure count', () => {
    it('should reset failure count on success', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Error'));
      const successFn = vi.fn().mockResolvedValue('ok');

      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getFailureCount()).toBe(1);

      const result = await cb.execute(successFn);
      expect(result).toBe('ok');
      expect(cb.getFailureCount()).toBe(0);
    });
  });

  describe('does not open below threshold', () => {
    it('should stay CLOSED with failures below threshold', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Error'));

      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();

      expect(cb.getState()).toBe('CLOSED');
    });
  });
});
