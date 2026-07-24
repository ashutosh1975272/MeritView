import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, withTimeout } from '../../providers/retry';
import { ProviderError } from '../../providers/errors';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('succeeds on first attempt', () => {
    it('should return result on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retries on transient failure', () => {
    it('should retry and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new ProviderError('test', 'transient error', 502, true))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times and succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new ProviderError('test', 'err1', 502, true))
        .mockRejectedValueOnce(new ProviderError('test', 'err2', 502, true))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 4, initialDelayMs: 10, maxDelayMs: 100 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('throws after max attempts', () => {
    it('should throw after exhausting retries', async () => {
      const fn = vi.fn().mockRejectedValue(new ProviderError('test', 'persistent error', 502, true));

      await expect(withRetry(fn, { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100 })).rejects.toThrow('persistent error');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('non-recoverable errors', () => {
    it('should not retry non-recoverable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new ProviderError('test', 'auth error', 401, false));

      await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow('auth error');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-ProviderError', () => {
    it('should retry on non-ProviderError if recoverable', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('single attempt', () => {
    it('should run once with maxAttempts=1', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(withRetry(fn, { maxAttempts: 1 })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('withTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve before timeout', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('done'), 10)));

    const result = await withTimeout(fn, 1000);
    expect(result).toBe('done');
  });

  it('should reject on timeout', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('done'), 2000)));

    const { ProviderTimeoutError } = await import('../../providers/errors');
    await expect(withTimeout(fn, 50)).rejects.toThrow(ProviderTimeoutError);
  });

  it('should propagate fn errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fn error'));

    await expect(withTimeout(fn, 1000)).rejects.toThrow('fn error');
  });
});
