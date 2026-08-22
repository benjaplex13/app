import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Flame, 
  Compass, 
  RefreshCw, 
  ChevronRight, 
  Lock,
  ArrowRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription } from '../types';
import { formatMoney } from '../utils/finance';
import { api } from '../utils/api';

interface ProactiveAdvisorBannerProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  subscription: UserSubscription | null;
  onOpenPlans?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ProactiveAdvisorBanner: React.FC<ProactiveAdvisorBannerProps> = ({
  trip,
  expenses,
  currentUser,
  subscription,
  onOpenPlans,
  onShowToast,
}) => {
  const isPremium = subscription?.plan === 'premium';

  const [isLoading, setIsLoading] = useState(false);
  const [adviceData, setAdviceData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (trip && isPremium) {
      fetchAdvice();
    }
  }, [trip.id, expenses.length, isPremium]);

  const fetchAdvice = async () => {
    try {
      setIsLoading(true);
      const res = await api.getProactiveAdvice(trip.id, trip, expenses);
      setAdviceData(res);
    } catch (err: any) {
      console.warn('Could not fetch proactive advice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not on premium, show a teaser banner
  if (!isPremium) {
    return (
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/50 to-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                Premium Exclusivo
              </span>
              <h3 className="text-sm font-bold text-white">Asistente Financiero Proactivo con IA</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Monitorea en tiempo real tu ritmo de gasto diario (burn rate), proyecta si llegarás a fin de viaje sin sobregiro y genera alertas inteligentes.
            </p>
          </div>
        </div>

        {onOpenPlans && (
          <button
            onClick={onOpenPlans}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-1.5 shrink-0 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Activar en Plan Premium</span>
          </button>
        )}
      </div>
    );
  }

  const metrics = adviceData?.metrics;
  const adviceItems = adviceData?.adviceItems || [];
  const pacingStatus = metrics?.pacingStatus || 'on_track';

  const statusConfig = {
    optimal: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      badge: 'Ritmo Saludable',
      icon: CheckCircle2,
    },
    on_track: {
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      badge: 'Dentro del Plan',
      icon: ShieldCheck,
    },
    warning: {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      badge: 'Alerta de Ritmo Elevado',
      icon: AlertTriangle,
    },
    critical: {
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      badge: 'Riesgo de Sobregiro',
      icon: Flame,
    },
  }[pacingStatus as 'optimal' | 'on_track' | 'warning' | 'critical'] || {
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    badge: 'Monitoreo Activo',
    icon: Compass,
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-[#0e1628] to-slate-950 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-2xl ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.badge}
              </span>
              <span className="text-xs text-slate-400 font-medium">Asistente Proactivo Rumbio</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Ritmo de Gasto: {metrics ? `${formatMoney(metrics.currentBurnRate, trip.currency)}/día` : 'Calculando...'}
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAdvice}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
            title="Recalcular análisis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1 transition"
          >
            <span>{isExpanded ? 'Ocultar Recomendaciones' : `Ver Consejos IA (${adviceItems.length})`}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10 pt-1">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Gasto Diario Actual</span>
            <p className="text-sm font-bold text-white font-mono">{formatMoney(metrics.currentBurnRate, trip.currency)}</p>
            <span className="text-[10px] text-slate-500">Promedio transcurrido</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Meta Diaria Segura</span>
            <p className="text-sm font-bold text-cyan-400 font-mono">{formatMoney(metrics.safeDailyBudgetRemaining, trip.currency)}</p>
            <span className="text-[10px] text-slate-500">Para {metrics.daysRemaining} días restantes</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Proyección al Cierre</span>
            <p className="text-sm font-bold text-white font-mono">{formatMoney(metrics.projectedTotalSpend, trip.currency)}</p>
            <span className="text-[10px] text-slate-500">Límite: {formatMoney(metrics.budget, trip.currency)}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Balance Proyectado</span>
            <p className={`text-sm font-bold font-mono ${metrics.projectedDeficitSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.projectedDeficitSurplus >= 0 
                ? `+${formatMoney(metrics.projectedDeficitSurplus, trip.currency)}`
                : `-${formatMoney(Math.abs(metrics.projectedDeficitSurplus), trip.currency)}`}
            </p>
            <span className="text-[10px] text-slate-500">
              {metrics.projectedDeficitSurplus >= 0 ? 'Remanente estimado' : 'Sobregiro previsto'}
            </span>
          </div>
        </div>
      )}

      {/* Expanded Advice Cards */}
      {isExpanded && adviceItems.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/5 relative z-10 animate-fadeIn">
          {adviceItems.map((item: any, idx: number) => {
            const isAlert = item.type === 'alert' || item.type === 'warning';
            return (
              <div
                key={item.id || idx}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isAlert 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-slate-950/80 border-white/10 text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{item.title}</span>
                    {item.impact && (
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        Impacto {item.impact}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed max-w-2xl">{item.message}</p>
                </div>

                {item.suggestedAction && (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 shrink-0 sm:max-w-xs text-[11px] space-y-0.5">
                    <span className="font-bold text-cyan-400 block">Acción recomendada:</span>
                    <span className="text-slate-300">{item.suggestedAction}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
