import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    displayName?: string;
    acceptTerms: boolean;
    marketingOptIn?: boolean;
  }) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      clearError: () => set({ error: null }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Login failed');
          }

          const data = await response.json();
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Registration failed');
          }

          const result = await response.json();
          set({
            user: result.user,
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Verification failed');
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      resendVerification: async () => {
        set({ isLoading: true, error: null });
        try {
          const accessToken = get().accessToken;
          if (!accessToken) throw new Error('Not authenticated');

          const response = await fetch(`${API_URL}/auth/verify-email/resend`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to resend');
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      logout: async () => {
        const { refreshToken, accessToken } = get();
        try {
          if (refreshToken) {
            await fetch(`${API_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
          }
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');

        try {
          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
        } catch (err) {
          get().logout();
          throw err;
        }
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            if (response.status === 401) {
              await get().refreshAccessToken();
              return get().checkAuth();
            }
            throw new Error('Auth check failed');
          }

          const user = await response.json();
          set({ user, isAuthenticated: true });
        } catch (err) {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);