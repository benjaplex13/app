import { CurrencyCode, ExpenseCategory } from '../types';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  approxRateToUSD: number; // 1 Unit = X USD
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', flag: '🇺🇸', approxRateToUSD: 1.0 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', approxRateToUSD: 1.08 },
  CLP: { code: 'CLP', name: 'Peso Chileno', symbol: '$', flag: '🇨🇱', approxRateToUSD: 0.00105 },
  MXN: { code: 'MXN', name: 'Peso Mexicano', symbol: '$', flag: '🇲🇽', approxRateToUSD: 0.055 },
  COP: { code: 'COP', name: 'Peso Colombiano', symbol: '$', flag: '🇨🇴', approxRateToUSD: 0.00024 },
  ARS: { code: 'ARS', name: 'Peso Argentino', symbol: '$', flag: '🇦🇷', approxRateToUSD: 0.00095 },
  PEN: { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', flag: '🇵🇪', approxRateToUSD: 0.27 },
  JPY: { code: 'JPY', name: 'Yen Japonés', symbol: '¥', flag: '🇯🇵', approxRateToUSD: 0.0066 },
  GBP: { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧', approxRateToUSD: 1.28 },
  BRL: { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', flag: '🇧🇷', approxRateToUSD: 0.18 },
  THB: { code: 'THB', name: 'Baht Tailandés', symbol: '฿', flag: '🇹🇭', approxRateToUSD: 0.028 },
  CAD: { code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$', flag: '🇨🇦', approxRateToUSD: 0.73 },
  AUD: { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', flag: '🇦🇺', approxRateToUSD: 0.65 },
  CHF: { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', flag: '🇨🇭', approxRateToUSD: 1.13 },
};

export const CATEGORY_DETAILS: Record<ExpenseCategory, { label: string; iconName: string; color: string; bg: string }> = {
  Alojamiento: { label: 'Alojamiento', iconName: 'Bed', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  Comida: { label: 'Comida y Bebida', iconName: 'Utensils', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  Transporte: { label: 'Transporte Local', iconName: 'Car', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  Vuelos: { label: 'Vuelos y Trenes', iconName: 'Plane', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  Actividades: { label: 'Actividades y Tours', iconName: 'Ticket', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  Compras: { label: 'Compras y Souvenirs', iconName: 'ShoppingBag', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  Seguro: { label: 'Seguro y Salud', iconName: 'ShieldCheck', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
  Imprevistos: { label: 'Imprevistos y Varios', iconName: 'AlertCircle', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
};

export const ALL_CATEGORIES: ExpenseCategory[] = [
  'Alojamiento',
  'Comida',
  'Transporte',
  'Vuelos',
  'Actividades',
  'Compras',
  'Seguro',
  'Imprevistos'
];
