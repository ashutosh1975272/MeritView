'use client';

import { useAuthStore } from '@/stores/useAuthStore';

export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    accessToken: store.accessToken,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: store.login,
    register: store.register,
    logout: store.logout,
    verifyEmail: store.verifyEmail,
    resendVerification: store.resendVerification,
    checkAuth: store.checkAuth,
    clearError: store.clearError,
  };
}
