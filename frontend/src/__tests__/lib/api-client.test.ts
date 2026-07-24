import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

let mockLocalStorage: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, val: string) => { mockLocalStorage[key] = val; }),
    removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
    clear: vi.fn(() => { mockLocalStorage = {}; }),
  },
  writable: true,
});

describe('api-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};
    mockLocalStorage['auth-storage'] = JSON.stringify({
      state: { accessToken: 'test_access', refreshToken: 'test_refresh' },
    });
  });

  it('T1.2.3.18: adds Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    });

    const { apiClient } = await import('@/lib/api-client');
    apiClient.setTokens('bearer_token', 'refresh_token');

    await apiClient.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer_token',
        }),
      })
    );
  });

  it('T1.2.3.19: handles 401 by refreshing token', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('/auth/refresh')) {
        return {
          ok: true,
          json: async () => ({
            accessToken: 'new_access',
            refreshToken: 'new_refresh',
          }),
        };
      }
      if (callCount === 1) {
        return { ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: 'retried' }) };
    });

    const { apiClient } = await import('@/lib/api-client');
    apiClient.setTokens('old_access', 'test_refresh');

    const result = await apiClient.get('/me');
    expect(result).toEqual({ data: 'retried' });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('T1.2.3.20: handles 403 correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }),
    });

    const { apiClient } = await import('@/lib/api-client');
    apiClient.setTokens('test_access', 'test_refresh');

    try {
      await apiClient.get('/admin');
    } catch (err: any) {
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('Forbidden');
    }
  });

  it('T1.2.3.21: handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

    const { apiClient } = await import('@/lib/api-client');
    apiClient.setTokens('test_access', 'test_refresh');

    await expect(apiClient.get('/test')).rejects.toThrow('Network error');
  });
});
