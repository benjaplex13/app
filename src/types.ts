export type CurrencyCode = 'USD' | 'EUR' | 'CLP' | 'MXN' | 'COP' | 'ARS' | 'PEN' | 'JPY' | 'GBP' | 'BRL' | 'THB' | 'CAD' | 'AUD' | 'CHF';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  verificationCode?: string;
  homeCurrency: CurrencyCode;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'Alojamiento' 
  | 'Comida' 
  | 'Transporte' 
  | 'Actividades' 
  | 'Compras' 
  | 'Imprevistos' 
  | 'Vuelos' 
  | 'Seguro';

export interface Expense {
  id: string;
  tripId: string;
  userId: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  category: ExpenseCategory;
  date: string;
  paidBy: string;
  splitBetween: string[];
  notes?: string;
  createdAt: string;
}

export interface PlanItem {
  id: string;
  category: ExpenseCategory;
  estimatedAmount: number;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  dueDate?: string;
  amount?: number;
  isCompleted: boolean;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: CurrencyCode;
  exchangeRate: number; // 1 Destination Currency = X Home Currency
  checklist?: ChecklistItem[];
  plans?: PlanItem[];
  members: string[]; // List of people traveling (e.g., ['Yo', 'Carlos', 'Valeria'])
  createdAt: string;
}

export interface DebtSettlement {
  from: string;
  to: string;
  amount: number;
}

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  content: string;
  code?: string;
  type: 'verification' | 'reset' | 'alert';
  timestamp: string;
  read: boolean;
}

export type TabType = 'overview' | 'expenses' | 'budget' | 'split' | 'planner' | 'checklist' | 'profile';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
