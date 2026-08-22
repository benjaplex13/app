import { CurrencyCode, ExpenseCategory } from '../types';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  region: 'Latinoamérica' | 'Norteamérica' | 'Europa' | 'Asia / Oceanía' | 'Medio Oriente y África';
  approxRateToUSD: number; // 1 Unit = X USD
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  // --- LATINOAMÉRICA ---
  CLP: { code: 'CLP', name: 'Peso Chileno', symbol: '$', flag: '🇨🇱', region: 'Latinoamérica', approxRateToUSD: 0.00105 },
  ARS: { code: 'ARS', name: 'Peso Argentino', symbol: '$', flag: '🇦🇷', region: 'Latinoamérica', approxRateToUSD: 0.00095 },
  BRL: { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', flag: '🇧🇷', region: 'Latinoamérica', approxRateToUSD: 0.18 },
  COP: { code: 'COP', name: 'Peso Colombiano', symbol: '$', flag: '🇨🇴', region: 'Latinoamérica', approxRateToUSD: 0.00024 },
  MXN: { code: 'MXN', name: 'Peso Mexicano', symbol: '$', flag: '🇲🇽', region: 'Latinoamérica', approxRateToUSD: 0.055 },
  PEN: { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', flag: '🇵🇪', region: 'Latinoamérica', approxRateToUSD: 0.27 },
  UYU: { code: 'UYU', name: 'Peso Uruguayo', symbol: '$U', flag: '🇺🇾', region: 'Latinoamérica', approxRateToUSD: 0.025 },
  BOB: { code: 'BOB', name: 'Boliviano', symbol: 'Bs', flag: '🇧🇴', region: 'Latinoamérica', approxRateToUSD: 0.145 },
  PYG: { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲', flag: '🇵🇾', region: 'Latinoamérica', approxRateToUSD: 0.00013 },
  CRC: { code: 'CRC', name: 'Colón Costarricense', symbol: '₡', flag: '🇨🇷', region: 'Latinoamérica', approxRateToUSD: 0.0019 },
  DOP: { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', flag: '🇩🇴', region: 'Latinoamérica', approxRateToUSD: 0.017 },
  GTQ: { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q', flag: '🇬🇹', region: 'Latinoamérica', approxRateToUSD: 0.13 },
  HNL: { code: 'HNL', name: 'Lempira Hondureño', symbol: 'L', flag: '🇭🇳', region: 'Latinoamérica', approxRateToUSD: 0.040 },
  NIO: { code: 'NIO', name: 'Córdoba Nicaragüense', symbol: 'C$', flag: '🇳🇮', region: 'Latinoamérica', approxRateToUSD: 0.027 },
  PAB: { code: 'PAB', name: 'Balboa Panameño', symbol: 'B/.', flag: '🇵🇦', region: 'Latinoamérica', approxRateToUSD: 1.0 },

  // --- NORTEAMÉRICA ---
  USD: { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', flag: '🇺🇸', region: 'Norteamérica', approxRateToUSD: 1.0 },
  CAD: { code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$', flag: '🇨🇦', region: 'Norteamérica', approxRateToUSD: 0.73 },

  // --- EUROPA ---
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', region: 'Europa', approxRateToUSD: 1.08 },
  GBP: { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧', region: 'Europa', approxRateToUSD: 1.28 },
  CHF: { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', flag: '🇨🇭', region: 'Europa', approxRateToUSD: 1.13 },
  SEK: { code: 'SEK', name: 'Corona Sueca', symbol: 'kr', flag: '🇸🇪', region: 'Europa', approxRateToUSD: 0.095 },
  NOK: { code: 'NOK', name: 'Corona Noruega', symbol: 'kr', flag: '🇳🇴', region: 'Europa', approxRateToUSD: 0.093 },
  DKK: { code: 'DKK', name: 'Corona Danesa', symbol: 'kr.', flag: '🇩🇰', region: 'Europa', approxRateToUSD: 0.145 },
  PLN: { code: 'PLN', name: 'Złoty Polaco', symbol: 'zł', flag: '🇵🇱', region: 'Europa', approxRateToUSD: 0.25 },
  CZK: { code: 'CZK', name: 'Corona Checa', symbol: 'Kč', flag: '🇨🇿', region: 'Europa', approxRateToUSD: 0.043 },
  HUF: { code: 'HUF', name: 'Forinto Húngaro', symbol: 'Ft', flag: '🇭🇺', region: 'Europa', approxRateToUSD: 0.0028 },
  RON: { code: 'RON', name: 'Leu Rumano', symbol: 'lei', flag: '🇷🇴', region: 'Europa', approxRateToUSD: 0.22 },
  TRY: { code: 'TRY', name: 'Lira Turca', symbol: '₺', flag: '🇹🇷', region: 'Europa', approxRateToUSD: 0.030 },
  ISK: { code: 'ISK', name: 'Corona Islandesa', symbol: 'kr', flag: '🇮🇸', region: 'Europa', approxRateToUSD: 0.0073 },

  // --- ASIA Y OCEANÍA ---
  JPY: { code: 'JPY', name: 'Yen Japonés', symbol: '¥', flag: '🇯🇵', region: 'Asia / Oceanía', approxRateToUSD: 0.0066 },
  CNY: { code: 'CNY', name: 'Yuan Chino', symbol: '¥', flag: '🇨🇳', region: 'Asia / Oceanía', approxRateToUSD: 0.14 },
  KRW: { code: 'KRW', name: 'Won Surcoreano', symbol: '₩', flag: '🇰🇷', region: 'Asia / Oceanía', approxRateToUSD: 0.00074 },
  THB: { code: 'THB', name: 'Baht Tailandés', symbol: '฿', flag: '🇹🇭', region: 'Asia / Oceanía', approxRateToUSD: 0.028 },
  SGD: { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$', flag: '🇸🇬', region: 'Asia / Oceanía', approxRateToUSD: 0.75 },
  AUD: { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', flag: '🇦🇺', region: 'Asia / Oceanía', approxRateToUSD: 0.65 },
  NZD: { code: 'NZD', name: 'Dólar Neozelandés', symbol: 'NZ$', flag: '🇳🇿', region: 'Asia / Oceanía', approxRateToUSD: 0.60 },
  IDR: { code: 'IDR', name: 'Rupia Indonesia', symbol: 'Rp', flag: '🇮🇩', region: 'Asia / Oceanía', approxRateToUSD: 0.000062 },
  INR: { code: 'INR', name: 'Rupia India', symbol: '₹', flag: '🇮🇳', region: 'Asia / Oceanía', approxRateToUSD: 0.012 },
  VND: { code: 'VND', name: 'Dong Vietnamita', symbol: '₫', flag: '🇻🇳', region: 'Asia / Oceanía', approxRateToUSD: 0.000040 },

  // --- MEDIO ORIENTE Y ÁFRICA ---
  AED: { code: 'AED', name: 'Dírham de EAU', symbol: 'AED', flag: '🇦🇪', region: 'Medio Oriente y África', approxRateToUSD: 0.27 },
  ILS: { code: 'ILS', name: 'Nuevo Shekel Israelí', symbol: '₪', flag: '🇮🇱', region: 'Medio Oriente y África', approxRateToUSD: 0.27 },
  EGP: { code: 'EGP', name: 'Libra Egipcia', symbol: 'E£', flag: '🇪🇬', region: 'Medio Oriente y África', approxRateToUSD: 0.021 },
  MAD: { code: 'MAD', name: 'Dírham Marroquí', symbol: 'DH', flag: '🇲🇦', region: 'Medio Oriente y África', approxRateToUSD: 0.10 },
  ZAR: { code: 'ZAR', name: 'Rand Sudafricano', symbol: 'R', flag: '🇿🇦', region: 'Medio Oriente y África', approxRateToUSD: 0.055 },
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

export const CURRENCY_REGIONS: Array<'Latinoamérica' | 'Norteamérica' | 'Europa' | 'Asia / Oceanía' | 'Medio Oriente y África'> = [
  'Latinoamérica',
  'Norteamérica',
  'Europa',
  'Asia / Oceanía',
  'Medio Oriente y África',
];

export const CURRENCIES_BY_REGION = CURRENCY_REGIONS.map((region) => ({
  region,
  currencies: Object.values(CURRENCIES).filter((c) => c.region === region),
}));

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

