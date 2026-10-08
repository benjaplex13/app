import React, { useState } from 'react';
import { 
  Minimize2, 
  Maximize2, 
  Compass, 
  MapPin, 
  CreditCard, 
  TrendingUp, 
  Sparkles, 
  X, 
  Layers,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription } from '../types';
import { convertToHomeCurrency, formatMoney } from '../utils/finance';
import { hasTierAccess } from '../data/plans';

interface PwaCompactWidgetProps {
  trip: Trip | null;
  expenses: Expense[];
  currentUser: User;
  subscription: UserSubscription | null;
  onOpenAppTab: (tab: any) => void;
  onOpenUpgradeGate: (title: string, desc: string) => void;
}

export const PwaCompactWidget: React.FC<PwaCompactWidgetProps> = ({
  trip,
  expenses,
  currentUser,
  subscription,
  onOpenAppTab,
  onOpenUpgradeGate,
}) => {
  const isPro = hasTierAccess(subscription, 'pro');
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('rumbio_widget_minimized') === 'true';
  });
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !trip) return null;

  const totalSpentHome = expenses.reduce((acc, curr) => {
    return acc + convertToHomeCurrency(curr.amount, curr.currency, trip, currentUser.homeCurrency);
  }, 0);

  const budgetRemaining = trip.budget - totalSpentHome;
  const percentUsed = trip.budget > 0 ? Math.round((totalSpentHome / trip.budget) * 100) : 0;

  const toggleMinimized = () => {
    const newVal = !isMinimized;
    setIsMinimized(newVal);
    localStorage.setItem('rumbio_widget_minimized', newVal ? 'true' : 'false');
  };

  const handleWidgetClick = () => {
    if (!isPro) {
      onOpenUpgradeGate(
        'Widget de Resumen Compacto (PWA)',
        'Acceso rápido flotante y embebible para consultar el acumulado de tu viaje en tiempo real mientras navegas. Exclusivo de planes Pro y Premium.'
      );
      return;
    }
  };

  if (isMinimized) {
    return (
      <aside
        aria-label="Widget flotante compacto"
        onClick={toggleMinimized}
        className="fixed bottom-6 left-6 z-40 bg-[#070b16]/95 border border-cyan-500/30 p-3 rounded-2xl shadow-2xl backdrop-blur-md cursor-pointer hover:border-cyan-400 hover:scale-105 transition-all flex items-center space-x-3 text-white group"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 flex items-center justify-center">
          <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
            <Compass className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Viaje Activo</span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {formatMoney(totalSpentHome, currentUser.homeCurrency)}
          </span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
      </aside>
    );
  }

  return (
    <aside
      aria-label="Widget de resumen rápido"
      className="fixed bottom-6 left-6 z-40 w-72 sm:w-80 bg-[#070b16]/95 border border-blue-500/30 rounded-3xl p-4 shadow-2xl backdrop-blur-xl text-white animate-in slide-in-from-bottom-5 duration-300 overflow-hidden"
      onClick={handleWidgetClick}
    >
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center border border-blue-500/30">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-display text-white truncate max-w-[130px]">
            {trip.name}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimized();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title="Minimizar widget"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title="Ocultar widget"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-slate-400">Gasto Acumulado:</span>
          <span className="text-base font-bold font-mono text-cyan-300">
            {formatMoney(totalSpentHome, currentUser.homeCurrency)}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Tope: {formatMoney(trip.budget, currentUser.homeCurrency)}</span>
            <span className={percentUsed >= 100 ? 'text-rose-400 font-bold' : percentUsed > 80 ? 'text-amber-400' : 'text-cyan-400'}>
              {percentUsed}% consumido
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                percentUsed >= 100 ? 'bg-rose-500' : percentUsed > 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            Restante: <b className={budgetRemaining < 0 ? 'text-rose-400' : 'text-emerald-400 font-mono'}>{formatMoney(budgetRemaining, currentUser.homeCurrency)}</b>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAppTab('expenses');
            }}
            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-0.5"
          >
            <span>Ver gastos</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
