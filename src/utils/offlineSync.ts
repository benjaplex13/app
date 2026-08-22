import { Expense, Trip } from '../types';
import { api } from './api';

const PENDING_EXPENSES_KEY = 'rumbio_pending_offline_expenses_v1';
const PENDING_TRIPS_KEY = 'rumbio_pending_offline_trips_v1';

export function getPendingExpenses(): Partial<Expense>[] {
  try {
    const raw = localStorage.getItem(PENDING_EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingExpenses(expenses: Partial<Expense>[]): void {
  try {
    localStorage.setItem(PENDING_EXPENSES_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Error saving pending expenses to localStorage:', err);
  }
}

export function addPendingExpense(expense: Partial<Expense>): void {
  const current = getPendingExpenses();
  // Check if already in queue
  const idx = current.findIndex((e) => e.id === expense.id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...expense, isOfflinePending: true };
  } else {
    current.push({ ...expense, isOfflinePending: true });
  }
  savePendingExpenses(current);
}

export function removePendingExpense(id: string): void {
  const current = getPendingExpenses();
  const filtered = current.filter((e) => e.id !== id);
  savePendingExpenses(filtered);
}

export function getPendingTrips(): Partial<Trip>[] {
  try {
    const raw = localStorage.getItem(PENDING_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingTrips(trips: Partial<Trip>[]): void {
  try {
    localStorage.setItem(PENDING_TRIPS_KEY, JSON.stringify(trips));
  } catch (err) {
    console.error('Error saving pending trips to localStorage:', err);
  }
}

export function addPendingTrip(trip: Partial<Trip>): void {
  const current = getPendingTrips();
  const idx = current.findIndex((t) => t.id === trip.id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...trip };
  } else {
    current.push(trip);
  }
  savePendingTrips(current);
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  syncedAt?: string;
}

export async function syncOfflineQueueToServer(): Promise<SyncResult> {
  if (!navigator.onLine) {
    return { success: false, syncedCount: 0, error: 'Sin conexión a internet.' };
  }

  const pendingExpenses = getPendingExpenses();
  const pendingTrips = getPendingTrips();

  if (pendingExpenses.length === 0 && pendingTrips.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  try {
    const res = await api.syncBatchOffline({
      expenses: pendingExpenses,
      trips: pendingTrips,
    });

    if (res.success) {
      // Clear pending queues once confirmed on server
      localStorage.removeItem(PENDING_EXPENSES_KEY);
      localStorage.removeItem(PENDING_TRIPS_KEY);
      return {
        success: true,
        syncedCount: (res.syncedExpensesCount || 0) + (res.syncedTripsCount || 0),
        syncedAt: res.syncedAt,
      };
    }
    return { success: false, syncedCount: 0, error: 'Respuesta no exitosa del servidor.' };
  } catch (err: any) {
    console.warn('Sync failed:', err);
    return { success: false, syncedCount: 0, error: err.message || 'Error al sincronizar' };
  }
}
