export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'CLP'
  | 'MXN'
  | 'COP'
  | 'ARS'
  | 'PEN'
  | 'BRL'
  | 'UYU'
  | 'BOB'
  | 'PYG'
  | 'CRC'
  | 'DOP'
  | 'GTQ'
  | 'HNL'
  | 'NIO'
  | 'PAB'
  | 'CAD'
  | 'GBP'
  | 'CHF'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'CZK'
  | 'HUF'
  | 'RON'
  | 'TRY'
  | 'ISK'
  | 'JPY'
  | 'CNY'
  | 'KRW'
  | 'THB'
  | 'SGD'
  | 'AUD'
  | 'NZD'
  | 'AED'
  | 'IDR'
  | 'INR'
  | 'VND'
  | 'EGP'
  | 'ZAR'
  | 'MAD'
  | 'ILS';

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
  // Pro enhancements
  exchangeRateAtDate?: number;
  exchangeRateDate?: string;
  receiptImageUrl?: string;
  isOfflinePending?: boolean;
  // Premium enhancements (Business mode & Open Banking)
  isTaxDeductible?: boolean;
  invoiceNumber?: string;
  merchantName?: string;
  bankTransactionId?: string;
}

export interface BusinessTripMetadata {
  companyName: string;
  employeeName: string;
  costCenter?: string;
  taxId?: string; // RUT o RFC o Tax ID
  projectCode?: string;
  approverName?: string;
  department?: string;
  travelPurpose?: string;
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
  // Premium business travel mode
  isBusinessTrip?: boolean;
  businessMetadata?: BusinessTripMetadata;
}

export interface DebtSettlement {
  from: string;
  to: string;
  amount: number;
  // Multi-currency details
  originalCurrencies?: { currency: CurrencyCode; amount: number }[];
  targetCurrency?: CurrencyCode;
  exchangeRateApplied?: number;
}

export interface MultiCurrencySettlementOption {
  displayCurrency: CurrencyCode;
  currencySymbol: string;
  settlements: DebtSettlement[];
  memberBalances: Record<string, { net: number; paid: number; consumed: number }>;
  rateUsed: number;
}

export interface BankMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  categorySuggestion: ExpenseCategory;
  bankName: string;
  accountType: string;
  referenceId?: string;
}

export interface BankingConfigStatus {
  fintocConfigured: boolean;
  belvoConfigured: boolean;
  supportedBanks: string[];
  activeProvider: 'fintoc' | 'belvo' | 'none';
  instructions: {
    title: string;
    description: string;
    keysNeeded: string[];
  };
}

export interface CrossTripComparisonItem {
  id: string;
  name: string;
  destination: string;
  durationDays: number;
  totalBudget: number;
  totalSpent: number;
  dailyBurnRate: number;
  currency: CurrencyCode;
  categories: Record<string, number>;
  percentBudgetUsed: number;
}

export interface BudgetProjectionResult {
  destination: string;
  durationDays: number;
  travelStyle: 'economico' | 'moderado' | 'premium';
  suggestedTotalBudget: number;
  suggestedDailyBurnRate: number;
  currency: CurrencyCode;
  categoryBreakdown: { category: ExpenseCategory; amount: number; percentage: number }[];
  historicalBasisCount: number;
  aiExplanation?: string;
}

export interface ProactiveAdvice {
  id: string;
  type: 'velocity_alert' | 'pacing_warning' | 'category_imbalance' | 'savings_tip' | 'positive_pacing';
  title: string;
  message: string;
  actionableRecommendation: string;
  urgency: 'high' | 'medium' | 'low';
  metrics?: {
    daysElapsed: number;
    daysTotal: number;
    daysRemaining: number;
    actualDailyBurnRate: number;
    targetDailyBudget: number;
    burnRateVariancePercent: number;
    projectedTotalSpend: number;
  };
  createdAt: string;
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

export type TabType = 'overview' | 'expenses' | 'budget' | 'split' | 'planner' | 'checklist' | 'chat' | 'plans' | 'profile';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type PlanTier = 'free' | 'pro' | 'premium' | 'developer';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'expired';

export interface PlanLimits {
  maxActiveTrips: number;
  maxCurrenciesPerTrip: number;
  canSplitExpenses: boolean;
  canExportReports: boolean;
  canAutoSettleDebts: boolean;
  canMonthlyEmailSummary: boolean;
  canAiBudgetRecommendations: boolean;
  hasAdvancedBudgetAlerts: boolean;
  // 5 New Pro (and higher) exclusive capabilities
  canScanReceiptsOcr: boolean;
  canOfflineSync: boolean;
  canRealTimeFx: boolean;
  canBudgetAlerts: boolean;
  canPwaWidget: boolean;
  // 5 New Premium exclusive capabilities
  canBankSync: boolean;
  canMultiCurrencyDebtSettlement: boolean;
  canCrossTripAnalytics: boolean;
  canBusinessTripMode: boolean;
  canProactiveAiAdvisor: boolean;
}

export interface OcrReceiptResult {
  amount?: number;
  currency?: CurrencyCode;
  category?: ExpenseCategory;
  title?: string;
  date?: string;
  detectedItems?: string[];
  rawText?: string;
  confidence?: number;
}

export interface BudgetAlert {
  id: string;
  tripId: string;
  category?: ExpenseCategory | 'Total';
  threshold: 80 | 100;
  spent: number;
  budget: number;
  currency: CurrencyCode;
  percentage: number;
  message: string;
  advice: string;
  createdAt: string;
}

export interface PlanPricing {
  id: PlanTier;
  name: string;
  badge?: string;
  popular?: boolean;
  priceMonthlyCLP: number;
  priceAnnualCLP: number;
  priceMonthlyFormatted: string;
  priceAnnualFormatted: string;
  description: string;
  features: { text: string; included: boolean; premiumOnly?: boolean }[];
  ctaLabel: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  plan: PlanTier;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  provider: 'flow' | 'mercadopago' | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed permission flags
  limits: PlanLimits;
  diagnostics?: {
    flowConfigured: boolean;
    flowSandbox: boolean;
    flowEndpoint: string;
    demoCheckoutEnabled?: boolean;
  };
}

export interface CheckoutResponse {
  url: string;
  token: string;
  redirectUrl: string;
  commerceOrder: string;
  flowOrderId?: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
