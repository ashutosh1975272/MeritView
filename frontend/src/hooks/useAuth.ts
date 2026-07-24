import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

export function useAuth(options?: { requireAuth?: boolean; redirectTo?: string }) {
  const { requireAuth = true, redirectTo = '/login' } = options || {};
  const router = useRouter();
  const store = useAuthStore();

  useEffect(() => {
    if (requireAuth && !store.isLoading && !store.isAuthenticated) {
      store.checkAuth();
    }
  }, [requireAuth, store.isLoading, store.isAuthenticated, store.checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    await store.login(email, password);
  }, [store]);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    displayName?: string;
    acceptTerms: boolean;
    marketingOptIn?: boolean;
  }) => {
    await store.register(data);
  }, [store]);

  const logout = useCallback(async () => {
    await store.logout();
    router.push(redirectTo);
  }, [store, router, redirectTo]);

  const refreshSession = useCallback(async () => {
    try {
      await store.refreshAccessToken();
    } catch {
      store.logout();
      router.push(redirectTo);
    }
  }, [store, router, redirectTo]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login,
    register,
    logout,
    refreshSession,
    clearError: store.clearError,
    verifyEmail: store.verifyEmail,
  };
}
