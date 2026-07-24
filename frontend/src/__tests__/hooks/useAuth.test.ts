import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockPush = vi.fn();
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockClearError = vi.fn();
const mockVerifyEmail = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: mockLogin,
        register: mockRegister,
        logout: mockLogout,
        refreshAccessToken: mockRefreshAccessToken,
        clearError: mockClearError,
        verifyEmail: mockVerifyEmail,
        checkAuth: vi.fn(),
      };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(), setState: vi.fn(), subscribe: vi.fn(), destroy: vi.fn() }
  ),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth state', () => {
    const { result } = renderHook(() => useAuth({ requireAuth: false }));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should call login and redirect', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuth({ requireAuth: false }));

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should call logout and redirect to login', async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuth({ requireAuth: false }));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should call register', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuth({ requireAuth: false }));

    await act(async () => {
      await result.current.register({ email: 'test@example.com', password: 'Test12345', acceptTerms: true });
    });

    expect(mockRegister).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Test12345', acceptTerms: true });
  });

  it('should handle refresh session and redirect on failure', async () => {
    mockRefreshAccessToken.mockRejectedValueOnce(new Error('fail'));
    mockLogout.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuth({ requireAuth: false }));

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
