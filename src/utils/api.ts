import { User, Trip, Expense, CurrencyCode, ExpenseCategory } from '../types';
import {
  loginUser,
  registerUser,
  verifyUserCode,
  requestPasswordReset,
  resetPasswordWithCode,
  getAllUsers,
  updateUser,
  getUserTrips,
  saveUserTrip,
  deleteUserTrip,
  getUserExpenses,
  saveUserExpense,
  deleteUserExpense,
  getActiveSession,
  getSimulatedEmails,
  seedUserDataIfEmpty,
} from './storage';

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

// Decode local or server JWT to extract user ID and email
function decodeTokenPayload(token: string): { id: string; email: string; name: string } | null {
  try {
    if (token.startsWith('rumbio_jwt_local_')) {
      const parts = token.replace('rumbio_jwt_local_', '').split('.');
      const jsonStr = decodeURIComponent(escape(atob(parts[0])));
      return JSON.parse(jsonStr);
    }
    // Standard JWT
    const base64Url = token.split('.')[1];
    if (base64Url) {
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    }
  } catch {
    // fallback
  }
  return null;
}

function getCurrentUserId(): string {
  const token = getStoredToken();
  if (token) {
    const payload = decodeTokenPayload(token);
    if (payload?.id) return payload.id;
  }
  const session = getActiveSession();
  if (session?.userId) return session.userId;
  const users = getAllUsers();
  if (users.length > 0) return users[0].id;
  return 'usr_local_default';
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
  // Authentication & OTP
  async register(name: string, email: string, password: string, homeCurrency: CurrencyCode) {
    try {
      return await apiFetch<{
        message: string;
        email: string;
        realEmailSent: boolean;
        simulated: boolean;
        resendConfigured: boolean;
        devCode?: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, homeCurrency }),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        // Fallback to local storage engine (e.g., static Vercel SPA)
        const { code } = registerUser(name, email, password, homeCurrency);
        return {
          message: 'Cuenta registrada exitosamente en modo local.',
          email,
          realEmailSent: false,
          simulated: true,
          resendConfigured: false,
          devCode: code,
        };
      }
      throw err;
    }
  },

  async verifyOtp(email: string, code: string) {
    try {
      const result = await apiFetch<{ token: string; user: User }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      setStoredToken(result.token);
      return result;
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        // Fallback to local storage
        const user = verifyUserCode(email, code);
        const token = 'rumbio_jwt_local_' + btoa(unescape(encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, name: user.name })))) + '.' + Date.now();
        setStoredToken(token);
        return { token, user };
      }
      throw err;
    }
  },

  async resendOtp(email: string) {
    try {
      return await apiFetch<{
        message: string;
        realEmailSent: boolean;
        simulated: boolean;
        devCode?: string;
      }>('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const code = requestPasswordReset(email);
        return {
          message: 'Código de verificación regenerado.',
          realEmailSent: false,
          simulated: true,
          devCode: code,
        };
      }
      throw err;
    }
  },

  async login(email: string, password: string) {
    try {
      const result = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(result.token);
      return result;
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        // Seamless fallback to local storage engine (e.g. Vercel SPA without custom Node server)
        const localResult = loginUser(email, password);
        setStoredToken(localResult.token);
        return localResult;
      }
      throw err;
    }
  },

  async forgotPassword(email: string) {
    try {
      return await apiFetch<{
        message: string;
        realEmailSent: boolean;
        simulated: boolean;
        devCode?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const code = requestPasswordReset(email);
        return {
          message: 'Código de recuperación generado.',
          realEmailSent: false,
          simulated: true,
          devCode: code,
        };
      }
      throw err;
    }
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    try {
      return await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        resetPasswordWithCode(email, code, newPassword);
        return { message: 'Contraseña actualizada exitosamente.' };
      }
      throw err;
    }
  },

  async getMe() {
    try {
      return await apiFetch<User>('/api/auth/me');
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const token = getStoredToken();
        if (token) {
          const payload = decodeTokenPayload(token);
          if (payload) {
            const users = getAllUsers();
            const user = users.find((u) => u.id === payload.id || u.email.toLowerCase() === payload.email.toLowerCase());
            if (user) {
              seedUserDataIfEmpty(user.id, user.name, user.homeCurrency);
              return user;
            }
          }
        }
        const session = getActiveSession();
        if (session) {
          const users = getAllUsers();
          const user = users.find((u) => u.id === session.userId);
          if (user) return user;
        }
      }
      throw err;
    }
  },

  async updateMe(updates: { homeCurrency?: CurrencyCode; name?: string }) {
    try {
      return await apiFetch<User>('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        return updateUser(userId, updates);
      }
      throw err;
    }
  },

  // Trips (Strict User Isolation)
  async getTrips() {
    try {
      return await apiFetch<Trip[]>('/api/trips');
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        return getUserTrips(userId);
      }
      throw err;
    }
  },

  async saveTrip(trip: Partial<Trip>) {
    try {
      return await apiFetch<Trip>('/api/trips', {
        method: 'POST',
        body: JSON.stringify(trip),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        const tripId = trip.id || 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const fullTrip: Trip = {
          id: tripId,
          userId,
          name: trip.name || 'Nuevo Viaje',
          destination: trip.destination || '',
          startDate: trip.startDate || new Date().toISOString().split('T')[0],
          endDate: trip.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          budget: trip.budget || 1000,
          currency: trip.currency || 'USD',
          exchangeRate: trip.exchangeRate || 1,
          members: trip.members || ['Yo'],
          plans: trip.plans || [],
          checklist: trip.checklist || [],
          createdAt: trip.createdAt || new Date().toISOString(),
        };
        saveUserTrip(userId, fullTrip);
        return fullTrip;
      }
      throw err;
    }
  },

  async deleteTrip(tripId: string) {
    try {
      return await apiFetch<{ message: string }>(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        deleteUserTrip(userId, tripId);
        return { message: 'Viaje eliminado.' };
      }
      throw err;
    }
  },

  // Expenses (Strict User Isolation)
  async getExpenses(tripId?: string) {
    try {
      const query = tripId ? `?tripId=${encodeURIComponent(tripId)}` : '';
      return await apiFetch<Expense[]>(`/api/expenses${query}`);
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        return getUserExpenses(userId, tripId);
      }
      throw err;
    }
  },

  async saveExpense(expense: Partial<Expense>) {
    try {
      return await apiFetch<Expense>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expense),
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        const expenseId = expense.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const fullExpense: Expense = {
          id: expenseId,
          tripId: expense.tripId || '',
          userId,
          title: expense.title || 'Gasto',
          amount: Number(expense.amount) || 0,
          currency: (expense.currency as CurrencyCode) || 'USD',
          category: (expense.category as ExpenseCategory) || 'Imprevistos',
          date: expense.date || new Date().toISOString().split('T')[0],
          paidBy: expense.paidBy || 'Yo',
          splitBetween: expense.splitBetween || ['Yo'],
          notes: expense.notes || '',
          createdAt: expense.createdAt || new Date().toISOString(),
        };
        saveUserExpense(userId, fullExpense);
        return fullExpense;
      }
      throw err;
    }
  },

  async deleteExpense(expenseId: string) {
    try {
      return await apiFetch<{ message: string }>(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405 || !err.status) {
        const userId = getCurrentUserId();
        deleteUserExpense(userId, expenseId);
        return { message: 'Gasto eliminado.' };
      }
      throw err;
    }
  },

  // Diagnostics & Email logs
  async getEmailLogs() {
    try {
      return await apiFetch<{ realEmailConfigured: boolean; logs: any[] }>('/api/email-logs');
    } catch {
      return { realEmailConfigured: false, logs: getSimulatedEmails() };
    }
  },

  async getHealth() {
    try {
      return await apiFetch<{
        status: string;
        realEmailConfigured: boolean;
        resendFrom: string;
        service: string;
      }>('/api/health');
    } catch {
      return {
        status: 'client_standalone',
        realEmailConfigured: false,
        resendFrom: 'Simulado Local',
        service: 'Rumbio Engine',
      };
    }
  },
};

