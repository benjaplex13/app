import { PlanPricing, PlanLimits, PlanTier, UserSubscription } from '../types';

/**
 * Central function to verify if a plan or subscription has unrestricted developer access (100% bypass of all limits)
 */
export function hasUnlimitedAccess(planOrSub: PlanTier | UserSubscription | string | null | undefined): boolean {
  if (!planOrSub) return false;
  const plan = typeof planOrSub === 'object' ? planOrSub.plan : planOrSub;
  return typeof plan === 'string' && plan.toLowerCase() === 'developer';
}

/**
 * Central function to verify if a user has access to a required tier.
 * Developer plan ALWAYS grants full bypass and returns true for all tiers and features.
 */
export function hasTierAccess(
  userPlanOrSub: PlanTier | UserSubscription | string | null | undefined,
  requiredTier: 'free' | 'pro' | 'premium'
): boolean {
  if (hasUnlimitedAccess(userPlanOrSub)) return true;
  if (!userPlanOrSub) return requiredTier === 'free';

  if (typeof userPlanOrSub === 'object') {
    const isCanceledDuringPaidPeriod = userPlanOrSub.status === 'canceled'
      && Boolean(userPlanOrSub.currentPeriodEnd)
      && Date.parse(userPlanOrSub.currentPeriodEnd as string) > Date.now();
    if (userPlanOrSub.status !== 'active' && !isCanceledDuringPaidPeriod) {
      return requiredTier === 'free';
    }
  }

  const plan = (typeof userPlanOrSub === 'object' ? userPlanOrSub.plan : userPlanOrSub || 'free').toLowerCase();
  if (requiredTier === 'free') return true;
  if (requiredTier === 'pro') return plan === 'pro' || plan === 'premium';
  if (requiredTier === 'premium') return plan === 'premium';
  return false;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxActiveTrips: 2,
    maxCurrenciesPerTrip: 2,
    canSplitExpenses: false,
    canExportReports: false,
    canAutoSettleDebts: false,
    canMonthlyEmailSummary: false,
    canAiBudgetRecommendations: false,
    hasAdvancedBudgetAlerts: false,
    // 5 Pro Features
    canScanReceiptsOcr: false,
    canOfflineSync: false,
    canRealTimeFx: false,
    canBudgetAlerts: false,
    canPwaWidget: false,
    // 5 Premium Features
    canBankSync: false,
    canMultiCurrencyDebtSettlement: false,
    canCrossTripAnalytics: false,
    canBusinessTripMode: false,
    canProactiveAiAdvisor: false,
  },
  pro: {
    maxActiveTrips: 9999,
    maxCurrenciesPerTrip: 9999,
    canSplitExpenses: true,
    canExportReports: true,
    canAutoSettleDebts: false,
    canMonthlyEmailSummary: false,
    canAiBudgetRecommendations: false,
    hasAdvancedBudgetAlerts: true,
    // 5 Pro Features
    canScanReceiptsOcr: true,
    canOfflineSync: true,
    canRealTimeFx: true,
    canBudgetAlerts: true,
    canPwaWidget: true,
    // 5 Premium Features
    canBankSync: false,
    canMultiCurrencyDebtSettlement: false,
    canCrossTripAnalytics: false,
    canBusinessTripMode: false,
    canProactiveAiAdvisor: false,
  },
  premium: {
    maxActiveTrips: 9999,
    maxCurrenciesPerTrip: 9999,
    canSplitExpenses: true,
    canExportReports: true,
    canAutoSettleDebts: true,
    canMonthlyEmailSummary: true,
    canAiBudgetRecommendations: true,
    hasAdvancedBudgetAlerts: true,
    // 5 Pro Features
    canScanReceiptsOcr: true,
    canOfflineSync: true,
    canRealTimeFx: true,
    canBudgetAlerts: true,
    canPwaWidget: true,
    // 5 Premium Features
    canBankSync: true,
    canMultiCurrencyDebtSettlement: true,
    canCrossTripAnalytics: true,
    canBusinessTripMode: true,
    canProactiveAiAdvisor: true,
  },
  developer: {
    maxActiveTrips: 999999,
    maxCurrenciesPerTrip: 999999,
    canSplitExpenses: true,
    canExportReports: true,
    canAutoSettleDebts: true,
    canMonthlyEmailSummary: true,
    canAiBudgetRecommendations: true,
    hasAdvancedBudgetAlerts: true,
    // 5 Pro Features
    canScanReceiptsOcr: true,
    canOfflineSync: true,
    canRealTimeFx: true,
    canBudgetAlerts: true,
    canPwaWidget: true,
    // 5 Premium Features & Future Experimental Features
    canBankSync: true,
    canMultiCurrencyDebtSettlement: true,
    canCrossTripAnalytics: true,
    canBusinessTripMode: true,
    canProactiveAiAdvisor: true,
  },
};

export const PLANS_DATA: PlanPricing[] = [
  {
    id: 'free',
    name: 'Gratis',
    badge: 'Básico',
    popular: false,
    priceMonthlyCLP: 0,
    priceAnnualCLP: 0,
    priceMonthlyFormatted: '$0',
    priceAnnualFormatted: '$0',
    description: 'Para viajeros individuales que organizan su primera aventura.',
    ctaLabel: 'Plan Actual',
    features: [
      { text: 'Hasta 2 viajes activos', included: true },
      { text: 'Hasta 2 divisas por viaje con tasa fija', included: true },
      { text: 'Presupuesto por categoría básico', included: true },
      { text: 'Checklist de viaje y notas', included: true },
      { text: 'Escaneo de recibos con OCR inteligente', included: false },
      { text: 'Modo sin conexión con sincronización automática', included: false },
      { text: 'Tasas de cambio en tiempo real con historial', included: false },
      { text: 'Alertas inteligentes de presupuesto (80% y 100%)', included: false },
      { text: 'Widget de resumen rápido PWA', included: false },
      { text: 'División de gastos entre viajeros (Split)', included: false },
      { text: 'Exportar a PDF, Excel y CSV', included: false },
      { text: 'Sincronización bancaria automática (Open Banking Chile/LatAm)', included: false, premiumOnly: true },
      { text: 'Liquidación grupal avanzada multi-moneda con conversor', included: false, premiumOnly: true },
      { text: 'Reportes comparativos entre viajes y proyección de presupuestos', included: false, premiumOnly: true },
      { text: 'Modo Viaje de Negocios y rendición de gastos en PDF con recibos', included: false, premiumOnly: true },
      { text: 'Asistente financiero proactivo con avisos de ritmo de gasto', included: false, premiumOnly: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Más Popular',
    popular: true,
    priceMonthlyCLP: 2990,
    priceAnnualCLP: 29990,
    priceMonthlyFormatted: '$2.990 CLP / mes',
    priceAnnualFormatted: '$29.990 CLP / año',
    description: 'Para viajeros frecuentes y grupos que necesitan flexibilidad total y reportes.',
    ctaLabel: 'Mejorar a Pro',
    features: [
      { text: 'Viajes activos ilimitados', included: true },
      { text: 'Escaneo inteligente de recibos con OCR (IA Vision)', included: true },
      { text: 'Modo sin conexión con sincronización automática', included: true },
      { text: 'Tasas de cambio en vivo del día con historial', included: true },
      { text: 'Alertas inteligentes de presupuesto (app y correo)', included: true },
      { text: 'Widget de resumen de viaje rápido (PWA)', included: true },
      { text: 'División de gastos básica entre viajeros (Split)', included: true },
      { text: 'Exportar reportes a PDF, Excel y CSV', included: true },
      { text: 'Divisas ilimitadas por viaje', included: true },
      { text: 'Sincronización bancaria automática (Open Banking)', included: false, premiumOnly: true },
      { text: 'Liquidación grupal avanzada multi-moneda con conversión', included: false, premiumOnly: true },
      { text: 'Reportes comparativos entre viajes y proyecciones', included: false, premiumOnly: true },
      { text: 'Modo Viaje de Negocios con rendición formal de gastos', included: false, premiumOnly: true },
      { text: 'Asistente financiero proactivo (avisos preventivos de ritmo)', included: false, premiumOnly: true },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    badge: 'Suite Completa',
    popular: false,
    priceMonthlyCLP: 5990,
    priceAnnualCLP: 59990,
    priceMonthlyFormatted: '$5.990 CLP / mes',
    priceAnnualFormatted: '$59.990 CLP / año',
    description: 'La suite financiera ejecutiva y definitiva para trotamundos, grupos y viajes corporativos.',
    ctaLabel: 'Mejorar a Premium',
    features: [
      { text: 'Todo lo incluido en el Plan Pro (OCR, Offline, FX, Alertas, PWA)', included: true },
      { text: '🏦 Sincronización Bancaria (Open Banking Fintoc / Belvo Chile & LatAm)', included: true },
      { text: '💱 Liquidación Grupal Avanzada Multi-Moneda con conversor en vivo', included: true },
      { text: '📊 Reportes Comparativos entre Viajes y Proyección inteligente de presupuestos', included: true },
      { text: '💼 Modo Viaje de Negocios y Rendición Formal de Gastos con recibos', included: true },
      { text: '🤖 Asistente Financiero Proactivo con análisis de ritmo y alertas automáticas', included: true },
      { text: 'Soporte prioritario 24/7 y acceso anticipado a novedades', included: true },
    ],
  },
];

export const PLANS = PLANS_DATA;
