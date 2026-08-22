import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  X, 
  MapPin, 
  Compass, 
  DollarSign, 
  Layers, 
  Loader2, 
  ArrowRight, 
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription, CurrencyCode } from '../types';
import { formatMoney, convertToHomeCurrency } from '../utils/finance';
import { api } from '../utils/api';

interface CrossTripAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  allExpenses: Expense[];
  currentUser: User;
  subscription: UserSubscription | null;
  onOpenPlans?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CrossTripAnalyticsModal: React.FC<CrossTripAnalyticsModalProps> = ({
  isOpen,
  onClose,
  trips,
  allExpenses,
  currentUser,
  subscription,
  onOpenPlans,
  onShowToast,
}) => {
  const isPremium = subscription?.plan === 'premium';

  // Projection state
  const [activeTab, setActiveTab] = useState<'comparison' | 'projection'>('comparison');
  const [destName, setDestName] = useState('Madrid, España');
  const [durationDays, setDurationDays] = useState(7);
  const [travelStyle, setTravelStyle] = useState<'budget' | 'balanced' | 'comfort' | 'luxury'>('balanced');
  const [isProjecting, setIsProjecting] = useState(false);
  const [projectionResult, setProjectionResult] = useState<any>(null);

  if (!isOpen) return null;

  // Process historical statistics across all trips
  const tripStats = trips.map(t => {
    const expenses = allExpenses.filter(e => e.tripId === t.id);
    const totalSpentHome = expenses.reduce((sum, e) => sum + convertToHomeCurrency(e.amount, e.currency, t, currentUser.homeCurrency), 0);
    const budgetHome = convertToHomeCurrency(t.budget, t.currency, t, currentUser.homeCurrency);
    
    const s = new Date(t.startDate);
    const e = new Date(t.endDate);
    const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const dailySpend = days > 0 ? totalSpentHome / days : 0;
    const percentUsed = budgetHome > 0 ? (totalSpentHome / budgetHome) * 100 : 0;

    return {
      id: t.id,
      name: t.name,
      destination: t.destination || t.name,
      currency: t.currency,
      days,
      totalSpentHome,
      budgetHome,
      dailySpend,
      percentUsed,
      expenseCount: expenses.length,
    };
  });

  const handleRunProjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destName.trim()) {
      onShowToast('Ingresa el destino que deseas proyectar.', 'warning');
      return;
    }

    if (!isPremium) {
      onShowToast('Las proyecciones presupuestarias con IA requieren el Plan Premium.', 'info');
      onOpenPlans?.();
      return;
    }

    try {
      setIsProjecting(true);
      const res = await api.getCrossTripBudgetProjection({
        destination: destName.trim(),
        durationDays,
        travelStyle,
        targetCurrency: currentUser.homeCurrency,
      });
      setProjectionResult(res);
      onShowToast('¡Proyección presupuestaria generada a partir de tu histórico!', 'success');
    } catch (err: any) {
      console.error('Error running budget projection:', err);
      onShowToast(err.message || 'Error al proyectar presupuesto.', 'error');
    } finally {
      setIsProjecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-3xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">Reportes Comparativos & Proyecciones</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                    Premium
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Analiza el histórico de gastos entre múltiples destinos y proyecta con IA tu próximo viaje.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center space-x-2 bg-slate-950/60 p-1 rounded-2xl border border-white/5 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'comparison'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Comparativa Histórica ({trips.length} viajes)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projection')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'projection'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Proyección para Próximo Destino</span>
          </button>
        </div>

        {/* Plan Gate Warning */}
        {!isPremium && (
          <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-indigo-200">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Esta suite de analítica comparativa y proyecciones presupuestarias requiere el <b>Plan Premium</b>.</span>
            </div>
            {onOpenPlans && (
              <button
                onClick={() => { onClose(); onOpenPlans(); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl shrink-0 transition"
              >
                Ver Plan Premium
              </button>
            )}
          </div>
        )}

        {/* Body content */}
        <div className="overflow-y-auto space-y-5 pr-1 relative z-10">
          {activeTab === 'comparison' ? (
            <div className="space-y-4">
              {/* Trip Cards Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tripStats.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-white text-sm block">{t.name}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          {t.destination} ({t.days} días)
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.percentUsed > 100 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {Math.round(t.percentUsed)}% presupuesto
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Gasto Total</span>
                        <span className="font-bold font-mono text-white">
                          {formatMoney(t.totalSpentHome, currentUser.homeCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Ritmo Diario</span>
                        <span className="font-bold font-mono text-cyan-400">
                          {formatMoney(t.dailySpend, currentUser.homeCurrency)}/día
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Projection Input Form */}
              <form onSubmit={handleRunProjection} className="p-5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Destino proyectado:</label>
                    <input
                      type="text"
                      required
                      value={destName}
                      onChange={(e) => setDestName(e.target.value)}
                      placeholder="Ej: Tokio, Japón"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Duración (días):</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Estilo de viaje:</label>
                    <select
                      value={travelStyle}
                      onChange={(e: any) => setTravelStyle(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="budget">Mochilero / Económico (0.7x)</option>
                      <option value="balanced">Balanceado (1.0x)</option>
                      <option value="comfort">Confort / Negocios (1.4x)</option>
                      <option value="luxury">Premium / Lujo (2.2x)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProjecting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  {isProjecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando histórico y benchmarks mundiales...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                      <span>Calcular Presupuesto Recomendado con IA</span>
                    </>
                  )}
                </button>
              </form>

              {/* Projection Result Card */}
              {projectionResult && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-500/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                        Resultado de Proyección
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {projectionResult.destination} ({projectionResult.durationDays} días)
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-mono font-black text-cyan-400 block">
                        {formatMoney(projectionResult.projectedTotal, currentUser.homeCurrency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ~{formatMoney(projectionResult.projectedDailyAverage, currentUser.homeCurrency)}/día
                      </span>
                    </div>
                  </div>

                  {/* Category allocation breakdown */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-xs font-bold text-slate-300 block">
                      Distribución sugerida por rubro:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {projectionResult.categories?.map((cat: any) => (
                        <div key={cat.category} className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs">
                          <span className="text-[10px] text-slate-400 block">{cat.category}</span>
                          <span className="font-bold text-white font-mono">
                            {formatMoney(cat.estimatedAmount, currentUser.homeCurrency)}
                          </span>
                          <span className="text-[9px] text-cyan-400 block">{cat.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
