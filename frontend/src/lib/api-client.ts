const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

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
        console.log(`[API Client] Executing /auth/refresh request...`);
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`[API Client] /auth/refresh failed with status ${response.status}. Body:`, errorBody);
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        console.log(`[API Client] /auth/refresh succeeded. Access token updated. Payload:`, data);
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

  private async request<T = any>(
    endpoint: string,
    options: RequestInit & { timeout?: number }
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    console.log(`[API Client] Starting request to ${endpoint}`, { options, accessToken: this.accessToken ? 'Present' : 'Missing' });

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
    
    console.log(`[API Client] Initial response from ${endpoint}:`, response.status);

    if (response.status === 401 && this.refreshToken) {
      console.log(`[API Client] 401 Unauthorized for ${endpoint}. Attempting to refresh token...`);
      try {
        await this.refreshAccessToken();
        console.log(`[API Client] Token refresh successful. Retrying request to ${endpoint}...`);
        const newHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...options.headers,
        };
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: newHeaders,
        });
        console.log(`[API Client] Retry response for ${endpoint}:`, response.status);
      } catch (e) {
        console.error(`[API Client] Token refresh completely failed:`, e);
        this.clearTokens();
        if (typeof window !== 'undefined') {
          console.log('[API Client] Redirecting to login due to failed refresh...');
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      console.error(`[API Client] Request to ${endpoint} failed with status ${response.status}`);
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      console.error(`[API Client] Error details from backend:`, error);
      const err = new Error(error.error?.message || 'Request failed') as any;
      err.status = response.status;
      err.code = error.error?.code;
      throw err;
    }

    if (response.status === 204) {
      console.log(`[API Client] Request to ${endpoint} succeeded (204 No Content)`);
      return undefined as T;
    }

    const data = await response.json();
    console.log(`[API Client] Request to ${endpoint} succeeded with data`);
    return data;
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T = any>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async put<T = any>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  // Dispute methods

  async getDisputes(): Promise<any[]> {
    return this.get('/disputes');
  }

  async getDispute(id: string): Promise<any> {
    return this.get(`/disputes/${id}`);
  }

  async createDispute(data: {
    category: string;
    title: string;
    summary?: string;
    estimatedStakesUsd?: number;
  }): Promise<any> {
    return this.post('/disputes', data);
  }

  async updateDispute(id: string, data: {
    title?: string;
    summary?: string;
    estimatedStakesUsd?: number;
  }): Promise<any> {
    return this.patch(`/disputes/${id}`, data);
  }

  async withdrawDispute(id: string): Promise<any> {
    return this.post(`/disputes/${id}/withdraw`, {});
  }

  async saveDraft(disputeId: string, partyId: string, sections: Record<string, string>, supportingDocumentIds?: string[]): Promise<{ id: string; status: string; wordCount: number }> {
    return this.put(`/disputes/${disputeId}/parties/${partyId}/brief/draft`, { sections, supportingDocumentIds });
  }

  async submitBrief(disputeId: string, partyId: string, sections: Record<string, string>, supportingDocumentIds?: string[]): Promise<{ id: string; status: string; sealHash: string; wordCount: number }> {
    return this.post(`/disputes/${disputeId}/parties/${partyId}/brief/submit`, { sections, supportingDocumentIds });
  }

  async getBrief(disputeId: string, partyId: string): Promise<{
    id: string;
    status: string;
    sections: Record<string, string>;
    wordCount: number;
    supportingDocumentIds: string[];
    sealHash: string | null;
    createdAt: string;
    updatedAt: string;
    submittedAt: string | null;
    sealedAt: string | null;
  }> {
    return this.get(`/disputes/${disputeId}/parties/${partyId}/brief`);
  }

  async createPaymentIntent(disputeId: string): Promise<{ clientSecret: string; paymentIntentId: string; amount: number; currency: string }> {
    return this.get(`/disputes/${disputeId}/payment-intent`);
  }

  async confirmPayment(disputeId: string, paymentIntentId: string): Promise<any> {
    return this.post(`/disputes/${disputeId}/payment/confirm`, { paymentIntentId });
  }

  async requestRefund(disputeId: string, reason: string): Promise<any> {
    return this.post(`/disputes/${disputeId}/refund-request`, { reason });
  }

  async getUserPayments(): Promise<any[]> {
    return this.get('/users/me/payments');
  }

  // Admin methods

  async adminGetDisputes(params?: {
    state?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ disputes: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.state) query.set('state', params.state);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.get(`/admin/disputes${qs ? `?${qs}` : ''}`);
  }

  async adminGetDispute(disputeId: string): Promise<any> {
    return this.get(`/admin/disputes/${disputeId}`);
  }

  async adminGetPendingAggregations(): Promise<{ pending: any[]; count: number }> {
    return this.get('/admin/aggregations/pending');
  }

  async adminPublishAggregation(disputeId: string, data: {
    content: string;
    disclaimers: string[];
    aggregatorProvider: string;
    aggregatorModelId: string;
    interEvaluatorAgreement?: number;
    overallConfidence?: number;
  }): Promise<any> {
    return this.post(`/admin/aggregations/${disputeId}/publish`, data);
  }

  async adminUnpublishAggregation(disputeId: string): Promise<any> {
    return this.post(`/admin/aggregations/${disputeId}/unpublish`, {});
  }

  // Opinion methods

  async getOpinion(disputeId: string): Promise<any> {
    return this.get(`/disputes/${disputeId}/opinion`);
  }

  async getOpinionPdfDownload(disputeId: string): Promise<{ downloadUrl: string }> {
    return this.get(`/disputes/${disputeId}/opinion/pdf`);
  }

  async getOpinionPdf(disputeId: string): Promise<{ downloadUrl: string }> {
    return this.get(`/disputes/${disputeId}/opinion/pdf`);
  }

  async getOpinionStatus(disputeId: string): Promise<{
    disputeId: string;
    status: 'pending' | 'delivered' | 'error';
    deliveredAt: string | null;
    pdfAvailable: boolean;
  }> {
    return this.get(`/disputes/${disputeId}/opinion/status`);
  }


  // Invitation methods

  async sendInvitation(disputeId: string, email: string): Promise<{ partyId: string; email: string; status: string; expiresAt: string }> {
    return this.post(`/disputes/${disputeId}/invite`, { email });
  }

  async getInvitationStatus(disputeId: string): Promise<{ status: string; email?: string; sentAt?: string; expiresAt?: string; acceptedAt?: string }> {
    return this.get(`/disputes/${disputeId}/invitation`);
  }

  async acceptInvitation(token: string): Promise<{ disputeId: string; message: string }> {
    return this.post(`/invitations/${token}/accept`, {});
  }

  async declineInvitation(token: string): Promise<{ disputeId: string; message: string }> {
    return this.post(`/invitations/${token}/decline`, {});
  }

  // Brief prep methods

  async createBriefPrepSession(disputeId: string, partyId: string): Promise<any> {
    return this.post(`/disputes/${disputeId}/parties/${partyId}/brief-prep/session`, {});
  }

  async sendBriefPrepMessage(disputeId: string, partyId: string, sessionId: string, content: string): Promise<any> {
    return this.post(`/disputes/${disputeId}/parties/${partyId}/brief-prep/session/${sessionId}/message`, { content });
  }

  async getBriefPrepSession(disputeId: string, partyId: string, sessionId: string): Promise<any> {
    return this.get(`/disputes/${disputeId}/parties/${partyId}/brief-prep/session/${sessionId}`);
  }

  // Document methods

  async uploadDocument(disputeId: string, partyId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    const response = await fetch(`${this.baseUrl}/disputes/${disputeId}/documents?partyId=${partyId}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
      const err = new Error(error.error?.message || 'Upload failed') as any;
      err.status = response.status;
      throw err;
    }
    return response.json();
  }

  async getDocuments(disputeId: string, partyId: string): Promise<any[]> {
    return this.get(`/disputes/${disputeId}/documents?partyId=${partyId}`);
  }

  async getDocument(disputeId: string, documentId: string): Promise<any> {
    return this.get(`/disputes/${disputeId}/documents/${documentId}`);
  }

  async deleteDocument(disputeId: string, documentId: string): Promise<any> {
    return this.delete(`/disputes/${disputeId}/documents/${documentId}`);
  }
}

export const apiClient = new ApiClient(API_URL);