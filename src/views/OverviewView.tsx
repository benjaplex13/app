import React from 'react';
import { 
  MapPin, 
  Calendar, 
  PlusCircle, 
  Download, 
  Settings, 
  TrendingUp, 
  PieChart, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Layers, 
  Sparkles,
  ArrowRightLeft,
  Receipt,
  ArrowRight,
  Building2,
  Briefcase,
  BarChart3,
  Zap
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription } from '../types';
import { CURRENCIES, CATEGORY_DETAILS } from '../data/currencies';
import { 
  convertToHomeCurrency, 
  formatMoney, 
  getCategoryBreakdown, 
  getDailySpending 
} from '../utils/finance';
import { ProactiveAdvisorBanner } from '../components/ProactiveAdvisorBanner';

interface OverviewViewProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  subscription?: UserSubscription | null;
  onOpenExpenseModal: () => void;
  onOpenQuickExpenseModal?: () => void;
  onOpenEditTripModal: () => void;
  onNavigateToExpenses?: () => void;
  onEditExpense?: (expense: Expense) => void;
  onExportCSV: () => void;
  onOpenExportModal?: () => void;
  onOpenBankSyncModal?: () => void;
  onOpenBusinessTripModal?: () => void;
  onOpenAnalyticsModal?: () => void;
  onOpenUpgradeGate?: (opts: any) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  trip,
  expenses,
  currentUser,
  subscription,
  onOpenExpenseModal,
  onOpenQuickExpenseModal,
  onOpenEditTripModal,
  onNavigateToExpenses,
  onEditExpense,
  onExportCSV,
  onOpenExportModal,
  onOpenBankSyncModal,
  onOpenBusinessTripModal,
  onOpenAnalyticsModal,
  onOpenUpgradeGate,
  onShowToast,
}) => {
  // Calculate total spent in home currency
  const totalSpentHome = expenses.reduce((acc, curr) => {
    return acc + convertToHomeCurrency(curr.amount, curr.currency, trip, currentUser.homeCurrency);
  }, 0);

  // Total spent in destination currency equivalent
  const totalSpentDest = trip.exchangeRate > 0 ? totalSpentHome / trip.exchangeRate : 0;

  const budgetRemaining = trip.budget - totalSpentHome;
  const percentUsed = trip.budget > 0 ? Math.round((totalSpentHome / trip.budget) * 100) : 0;

  // Days calculations
  const start = new Date(trip.startDate + 'T00:00:00');
  const end = new Date(trip.endDate + 'T00:00:00');
  const diffTime = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
  const dailyAverage = totalSpentHome / (diffTime || 1);

  // Category and daily aggregations
  const categoryBreakdown = getCategoryBreakdown(expenses, trip, currentUser.homeCurrency);
  const dailySpending = getDailySpending(expenses, trip, currentUser.homeCurrency);

  // Find top spending category
  const topCategoryEntry = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
  const topCategoryName = topCategoryEntry && topCategoryEntry[1] > 0 ? topCategoryEntry[0] : 'Sin gastos';
  const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1] : 0;

  // Recent expenses (sorted by date descending)
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Proactive Financial Advisor Banner (Premium Feature 5) */}
      <ProactiveAdvisorBanner
        trip={trip}
        expenses={expenses}
        currentUser={currentUser}
        subscription={subscription || null}
        onOpenPlans={() => onOpenUpgradeGate?.({ requiredPlan: 'premium', title: 'Asistente Financiero Proactivo' })}
        onShowToast={onShowToast || (() => {})}
      />

      {/* Flight Pass / Header Card */}
      <div className="relative rounded-[32px] overflow-hidden p-6 sm:p-10 flex flex-col justify-end border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-[#050811] to-[#050811] z-0"></div>

        {/* Top bar with destination & action buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10 mb-8">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest block mb-1">
              Destino Actual • {trip.destination}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              {trip.name}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{trip.startDate} hasta {trip.endDate} ({diffTime} días de viaje)</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenQuickExpenseModal && (
              <button
                id="quick-expense-overview-btn"
                onClick={onOpenQuickExpenseModal}
                className="bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-xl shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
                title="Registro Rápido en 5 toques estilo iOS"
              >
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>⚡ Rápido (10s)</span>
              </button>
            )}

            <button
              id="add-expense-overview-btn"
              onClick={onOpenExpenseModal}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl flex items-center space-x-2 border border-white/10 shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Formulario completo con desglose, OCR y notas"
            >
              <PlusCircle className="w-4 h-4 text-blue-400" />
              <span>+ Detallado</span>
            </button>

            {/* Premium Button: Bank Sync */}
            {onOpenBankSyncModal && (
              <button
                onClick={onOpenBankSyncModal}
                className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 text-xs font-semibold px-4 py-3 rounded-2xl border border-cyan-500/30 flex items-center space-x-1.5 transition shadow-md"
                title="Sincronizar movimientos bancarios (Open Banking)"
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Banco</span>
              </button>
            )}

            {/* Premium Button: Business Trip Mode */}
            {onOpenBusinessTripModal && (
              <button
                onClick={onOpenBusinessTripModal}
                className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold px-4 py-3 rounded-2xl border border-emerald-500/30 flex items-center space-x-1.5 transition shadow-md"
                title="Modo Viaje de Negocios y Rendición"
              >
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Negocios</span>
              </button>
            )}

            {/* Premium Button: Cross-Trip Analytics */}
            {onOpenAnalyticsModal && (
              <button
                onClick={onOpenAnalyticsModal}
                className="bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 text-xs font-semibold px-4 py-3 rounded-2xl border border-indigo-500/30 flex items-center space-x-1.5 transition shadow-md"
                title="Reportes comparativos y proyecciones IA"
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Analítica IA</span>
              </button>
            )}

            <button
              onClick={onOpenExportModal || onExportCSV}
              className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-3 rounded-2xl border border-white/10 flex items-center space-x-2 transition shadow-md"
              title="Exportar informe profesional a PDF, JSON o CSV"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Exportar</span>
            </button>

            <button
              onClick={onOpenEditTripModal}
              className="bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white p-3 rounded-2xl border border-white/10 transition"
              title="Editar viaje y tipo de cambio"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Budget overview banner */}
        <div className="z-10 w-full mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-medium">Presupuesto Consumido</p>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl sm:text-5xl font-black ${percentUsed >= 100 ? 'text-rose-400' : 'text-white'}`}>
                  {percentUsed}%
                </span>
                <span className="text-slate-400 text-sm font-mono">
                  {formatMoney(totalSpentHome, currentUser.homeCurrency)} / {formatMoney(trip.budget, currentUser.homeCurrency)}
                </span>
              </div>
            </div>
            {percentUsed >= 100 && (
              <span className="text-xs px-3 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 font-semibold animate-pulse">
                ¡Límite superado por {formatMoney(Math.abs(budgetRemaining), currentUser.homeCurrency)}!
              </span>
            )}
          </div>

          <div className="w-full h-3 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-md">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed >= 100
                  ? 'bg-rose-500'
                  : percentUsed > 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Presupuesto Asignado</span>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatMoney(trip.budget, currentUser.homeCurrency)}
            </div>
            <span className="text-[10px] text-slate-500">Moneda Base ({currentUser.homeCurrency})</span>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Gasto Total Real</span>
            <div className={`text-xl font-black font-mono mt-1 ${percentUsed >= 100 ? 'text-rose-400' : percentUsed > 80 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {formatMoney(totalSpentHome, currentUser.homeCurrency)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              ~ {formatMoney(totalSpentDest, trip.currency)} en {trip.currency}
            </span>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Saldo Disponible</span>
            <div className={`text-xl font-black font-mono mt-1 ${budgetRemaining < 0 ? 'text-rose-500' : 'text-blue-400'}`}>
              {formatMoney(budgetRemaining, currentUser.homeCurrency)}
            </div>
            <span className="text-[10px] text-slate-500">{percentUsed}% del tope consumido</span>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Tipo de Cambio</span>
              <button
                onClick={onOpenEditTripModal}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <ArrowRightLeft className="w-3 h-3" /> Editar
              </button>
            </div>
            <div className="text-sm font-black text-white font-mono mt-1">
              1 {trip.currency} = {trip.exchangeRate} {currentUser.homeCurrency}
            </div>
            <span className="text-[10px] text-slate-500">
              {CURRENCIES[trip.currency]?.flag} {CURRENCIES[trip.currency]?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Quick Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-900/30 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block">Promedio Diario</span>
            <span className="text-base font-bold text-white font-mono">
              {formatMoney(dailyAverage, currentUser.homeCurrency)}
            </span>
          </div>
        </div>

        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-900/30 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block">Transacciones</span>
            <span className="text-base font-bold text-white font-mono">
              {expenses.length} desembolsos
            </span>
          </div>
        </div>

        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-900/30 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block">Mayor Categoría</span>
            <span className="text-base font-bold text-white font-mono truncate block max-w-[170px]">
              {topCategoryName} ({formatMoney(topCategoryAmount, currentUser.homeCurrency)})
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid: Category Breakdown + Daily Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category Breakdown Card */}
        <div className="lg:col-span-6 bg-white/5 rounded-[32px] border border-white/5 p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 font-display">
              <PieChart className="w-4 h-4 text-blue-400" /> Distribución por Categoría
            </h3>

            {expenses.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay gastos registrados aún para generar el gráfico. Haz clic en "+ Registrar Gasto" para comenzar.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(categoryBreakdown)
                  .filter(([_, amount]) => amount > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const catPercent = totalSpentHome > 0 ? Math.round((amount / totalSpentHome) * 100) : 0;
                    const details = CATEGORY_DETAILS[category as any] || { label: category, color: 'text-blue-400', bg: 'bg-blue-500' };

                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${details.bg.split(' ')[0]}`} />
                            {category}
                          </span>
                          <div className="space-x-2">
                            <span className="font-mono font-bold text-white">
                              {formatMoney(amount, currentUser.homeCurrency)}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">({catPercent}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                            style={{ width: `${catPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Daily Spending Trend Card */}
        <div className="lg:col-span-6 bg-white/5 rounded-[32px] border border-white/5 p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 font-display">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Evolución de Gasto Diario
            </h3>

            {dailySpending.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Los consumos diarios aparecerán aquí conforme añadas gastos.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-2 h-44 pt-4 border-b border-white/5 pb-2">
                  {dailySpending.map((day) => {
                    const maxDay = Math.max(...dailySpending.map(d => d.amount), 1);
                    const heightPercent = Math.max(12, Math.round((day.amount / maxDay) * 100));

                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 bg-slate-900 border border-white/10 text-white text-[10px] py-1 px-2 rounded-lg font-mono opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 shadow-xl">
                          {formatMoney(day.amount, currentUser.homeCurrency)}
                        </div>

                        <div className="w-full max-w-[28px] h-32 flex items-end justify-center">
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 rounded-t-lg transition-all duration-300"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[40px]">
                          {day.formattedDate}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                  <span>Días activos: <b className="text-white">{dailySpending.length}</b></span>
                  <span>Promedio: <b className="text-blue-400 font-mono">{formatMoney(dailyAverage, currentUser.homeCurrency)}</b></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gastos Recientes Section */}
      <div className="bg-white/5 rounded-[32px] border border-white/5 p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Gastos Recientes</h3>
              <p className="text-[11px] text-slate-400">Últimos movimientos registrados en este viaje</p>
            </div>
          </div>

          {onNavigateToExpenses && (
            <button
              onClick={onNavigateToExpenses}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>Ver todos ({expenses.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-semibold">Aún no has registrado ningún gasto</p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
              Usa el botón "+ Registrar Gasto" para agregar tu primer ticket o recibo.
            </p>
            <button
              onClick={onOpenExpenseModal}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Registrar Primer Gasto</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentExpenses.map((exp) => {
              const converted = convertToHomeCurrency(exp.amount, exp.currency, trip, currentUser.homeCurrency);
              const catDetails = CATEGORY_DETAILS[exp.category] || { bg: 'bg-blue-500/20', color: 'text-blue-400', label: exp.category };

              return (
                <div
                  key={exp.id}
                  onClick={() => onEditExpense?.(exp)}
                  className={`py-3.5 flex items-center justify-between px-2 rounded-xl transition ${
                    onEditExpense ? 'hover:bg-white/5 cursor-pointer active:scale-[0.99]' : 'hover:bg-white/[0.02]'
                  }`}
                  title={onEditExpense ? 'Clic para ver o editar gasto' : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${catDetails.bg} ${catDetails.color}`}>
                      {exp.category}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{exp.title}</h4>
                      <p className="text-[10px] text-slate-400">
                        {exp.date} • Pagado por: <b className="text-slate-300">{exp.paidBy}</b>
                        {exp.splitBetween && exp.splitBetween.length > 1 && (
                          <span> • Dividido ({exp.splitBetween.length})</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white block">
                      {formatMoney(converted, currentUser.homeCurrency)}
                    </span>
                    {exp.currency !== currentUser.homeCurrency && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatMoney(exp.amount, exp.currency)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
