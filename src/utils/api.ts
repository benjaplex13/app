import { User, Trip, Expense, CurrencyCode, UserSubscription, PlanTier, BillingCycle, CheckoutResponse } from '../types';

const TOKEN_KEY = 'rumbio_jwt_token_v1';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Universal fetcher with automatic Bearer token injection
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Error del servidor (${response.status})`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Authentication & OTP (Strict Real Backend)
  async register(name: string, email: string, password: string, homeCurrency: CurrencyCode) {
    return apiFetch<{
      message: string;
      email: string;
      realEmailSent: boolean;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, homeCurrency }),
    });
  },

  async verifyOtp(email: string, code: string) {
    const result = await apiFetch<{ token: string; user: User }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    setStoredToken(result.token);
    return result;
  },

  async resendOtp(email: string) {
    return apiFetch<{
      message: string;
      realEmailSent: boolean;
    }>('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async login(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(result.token);
    return result;
  },

  async forgotPassword(email: string) {
    return apiFetch<{
      message: string;
      realEmailSent: boolean;
    }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    return apiFetch<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  async getMe() {
    return apiFetch<User>('/api/auth/me');
  },

  async updateMe(updates: { homeCurrency?: CurrencyCode; name?: string }) {
    return apiFetch<User>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Trips (Strict Real Backend & Isolation)
  async getTrips() {
    return apiFetch<Trip[]>('/api/trips');
  },

  async saveTrip(trip: Partial<Trip>) {
    return apiFetch<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  },

  async deleteTrip(tripId: string) {
    return apiFetch<{ message: string }>(`/api/trips/${tripId}`, {
      method: 'DELETE',
    });
  },

  // Expenses (Strict Real Backend & Isolation)
  async getExpenses(tripId?: string) {
    const query = tripId ? `?tripId=${encodeURIComponent(tripId)}` : '';
    return apiFetch<Expense[]>(`/api/expenses${query}`);
  },

  async saveExpense(expense: Partial<Expense>) {
    return apiFetch<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  async deleteExpense(expenseId: string) {
    return apiFetch<{ message: string }>(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  // Subscriptions & Flow.cl Integration
  async getSubscription() {
    return apiFetch<UserSubscription>('/api/subscriptions/me');
  },

  async createSubscriptionCheckout(plan: PlanTier, billingCycle: BillingCycle) {
    return apiFetch<CheckoutResponse>('/api/subscriptions/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, billingCycle }),
    });
  },

  // TEMPORARY DEMO MODE: Activates plan instantly for testing without Flow payment dependency
  async activateDemoSubscription(plan: PlanTier, billingCycle: BillingCycle = 'monthly') {
    return apiFetch<{ success: boolean; message: string; subscription: UserSubscription; isDemo: boolean }>(
      '/api/subscriptions/demo-activate',
      {
        method: 'POST',
        body: JSON.stringify({ plan, billingCycle }),
      }
    );
  },

  async cancelSubscription() {
    return apiFetch<{ message: string; subscription: UserSubscription }>('/api/subscriptions/cancel', {
      method: 'POST',
    });
  },

  // AI Chatbot (Pro & Premium)
  async sendChatMessage(messages: { role: 'user' | 'assistant'; content: string }[], currentTripId?: string | null) {
    return apiFetch<{ reply: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, currentTripId }),
    });
  },

  // AI Summary for Trip & PDF Report
  async getTripAiSummary(tripId?: string, tripData?: Trip, expensesData?: Expense[]) {
    return apiFetch<{ summary: string; source: string }>('/api/ai/trip-summary', {
      method: 'POST',
      body: JSON.stringify({ tripId, tripData, expensesData }),
    });
  },

  // 1. Pro: Receipt OCR Scanning
  async scanReceiptOcr(imageBase64: string, mimeType: string = 'image/jpeg', defaultCurrency: CurrencyCode = 'USD') {
    return apiFetch<{
      success: boolean;
      result: {
        amount: number;
        currency: CurrencyCode;
        category: any;
        title: string;
        date: string;
        detectedItems: string[];
        rawText: string;
        confidence: number;
      };
    }>('/api/ai/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, defaultCurrency }),
    });
  },

  // 2. Pro: Real-Time & Historical FX Rates
  async getLiveFxRates(base: string = 'USD') {
    return apiFetch<{
      base: string;
      rates: Record<string, number>;
      cached: boolean;
      updatedAt: string;
      provider: string;
      isFallback?: boolean;
    }>(`/api/fx/rates?base=${encodeURIComponent(base)}`);
  },

  async getHistoricalFxRate(base: string, target: string, date: string) {
    return apiFetch<{
      base: string;
      target: string;
      date: string;
      rate: number;
      provider: string;
    }>(`/api/fx/historical?base=${encodeURIComponent(base)}&target=${encodeURIComponent(target)}&date=${encodeURIComponent(date)}`);
  },

  // 3. Pro: Smart Budget Alert Notifications
  async sendBudgetAlertNotification(payload: {
    tripName: string;
    category?: string;
    threshold: number;
    spent: number;
    budget: number;
    currency: string;
    sendEmail?: boolean;
  }) {
    return apiFetch<{
      success: boolean;
      alert: any;
    }>('/api/budget/alert-notification', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 4. Pro: Offline Batch Synchronization
  async syncBatchOffline(data: { expenses?: Partial<Expense>[]; trips?: Partial<Trip>[] }) {
    return apiFetch<{
      success: boolean;
      syncedTripsCount: number;
      syncedExpensesCount: number;
      syncedTrips: Trip[];
      syncedExpenses: Expense[];
      syncedAt: string;
    }>('/api/sync/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Generic request helpers
  async get<T>(endpoint: string) {
    return apiFetch<T>(endpoint, { method: 'GET' });
  },

  async post<T>(endpoint: string, body?: any) {
    return apiFetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // Diagnostics & Email logs
  async getEmailLogs() {
    return apiFetch<{ realEmailConfigured: boolean; logs: any[] }>('/api/email-logs');
  },

  async getHealth() {
    return apiFetch<{
      status: string;
      realEmailConfigured: boolean;
      resendFrom: string;
      service: string;
      demoOtpActive?: boolean;
      demoOtpCode?: string | null;
    }>('/api/health');
  },

  async getAuthConfig() {
    return apiFetch<{
      demoOtpActive: boolean;
      demoOtpCode: string | null;
    }>('/api/auth/config');
  },
};
