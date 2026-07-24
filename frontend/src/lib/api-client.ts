const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage();
    }
  }

  private loadTokensFromStorage() {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const { state } = JSON.parse(stored);
        this.accessToken = state.accessToken;
        this.refreshToken = state.refreshToken;
      }
    } catch {
      // Ignore parsing errors
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;

        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const { state } = JSON.parse(stored);
            state.accessToken = data.access_token;
            state.refreshToken = data.refresh_token;
            localStorage.setItem('auth-storage', JSON.stringify({ state }));
          }
        }
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refreshAccessToken();
        const newHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...options.headers,
        };
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: newHeaders,
        });
      } catch {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      const err = new Error(error.error?.message || 'Request failed') as any;
      err.status = response.status;
      err.code = error.error?.code;
      throw err;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_URL);