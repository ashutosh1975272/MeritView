import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware');
  return { ...actual as any };
});

const mockUser = { id: 'user_1', email: 'test@example.com', role: 'STANDARD', emailVerified: true };

describe('useAuthStore', () => {
  let store: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/stores/useAuthStore');
    store = mod.useAuthStore;
    store.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('T1.2.3.2: initial state is null user and null tokens', () => {
    const state = store.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('T1.2.3.3: login action sets user and tokens', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: mockUser,
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
      }),
    });

    await store.getState().login('test@example.com', 'password123');

    const state = store.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access_123');
    expect(state.refreshToken).toBe('refresh_123');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('T1.2.3.4: logout action clears user and tokens', async () => {
    store.setState({
      user: mockUser,
      accessToken: 'access_123',
      refreshToken: 'refresh_123',
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValueOnce({ ok: true });

    await store.getState().logout();

    const state = store.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('T1.2.3.5: refresh action updates tokens', async () => {
    store.setState({
      accessToken: 'old_access',
      refreshToken: 'old_refresh',
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
      }),
    });

    await store.getState().refreshAccessToken();

    const state = store.getState();
    expect(state.accessToken).toBe('new_access');
    expect(state.refreshToken).toBe('new_refresh');
  });
});
