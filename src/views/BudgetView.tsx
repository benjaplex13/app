import React, { useState } from 'react';
import { 
  PieChart, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Edit2, 
  Save, 
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { Trip, Expense, User, ExpenseCategory } from '../types';
import { ALL_CATEGORIES, CATEGORY_DETAILS } from '../data/currencies';
import { convertToHomeCurrency, formatMoney, getCategoryBreakdown } from '../utils/finance';

interface BudgetViewProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  onUpdateTripPlans: (plans: Trip['plans']) => void;
  onShowToast: (msg: string, type: 'success' | 'info') => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  trip,
  expenses,
  currentUser,
  onUpdateTripPlans,
  onShowToast,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [plansState, setPlansState] = useState<Record<ExpenseCategory, string>>(() => {
    const initial: Record<string, string> = {};
    ALL_CATEGORIES.forEach((cat) => {
      const found = (trip.plans || []).find((p) => p.category === cat);
      initial[cat] = found ? found.estimatedAmount.toString() : Math.round(trip.budget / ALL_CATEGORIES.length).toString();
    });
    return initial as Record<ExpenseCategory, string>;
  });

  const categoryBreakdown = getCategoryBreakdown(expenses, trip, currentUser.homeCurrency);
  const totalSpentHome = expenses.reduce((acc, curr) => {
    return acc + convertToHomeCurrency(curr.amount, curr.currency, trip, currentUser.homeCurrency);
  }, 0);

  const handleSavePlans = () => {
    const newPlans = ALL_CATEGORIES.map((cat) => ({
      id: 'plan_' + cat,
      category: cat,
      estimatedAmount: parseFloat(plansState[cat]) || 0,
    }));

    onUpdateTripPlans(newPlans);
    setIsEditing(false);
    onShowToast('Límites de presupuesto por categoría actualizados.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Header */}
      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" /> Presupuestos y Topes por Categoría
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervisa tus topes por categoría y recibe alertas visuales cuando consumas más del 80% o superes el 100%.
          </p>
        </div>

        <div>
          {isEditing ? (
            <button
              onClick={handleSavePlans}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Topes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
            >
              <Edit2 className="w-4 h-4" />
              <span>Ajustar Límites</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ALL_CATEGORIES.map((cat) => {
          const spentInCat = categoryBreakdown[cat] || 0;
          const planItem = (trip.plans || []).find((p) => p.category === cat);
          const limitAmount = planItem ? planItem.estimatedAmount : Math.round(trip.budget / ALL_CATEGORIES.length);
          const percent = limitAmount > 0 ? Math.round((spentInCat / limitAmount) * 100) : 0;
          const remaining = limitAmount - spentInCat;
          const details = CATEGORY_DETAILS[cat];

          const isDanger = percent >= 100;
          const isWarning = percent >= 80 && percent < 100;

          return (
            <div
              key={cat}
              className={`p-6 rounded-[28px] border transition flex flex-col justify-between ${
                isDanger
                  ? 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/40'
                  : isWarning
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : 'border-white/5 bg-white/5'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${details.bg}`}>
                      <span className={details.color}>●</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{details.label}</h4>
                      <span className="text-[10px] text-slate-500">
                        {isDanger ? 'Límite Superado' : isWarning ? 'Cerca del Tope' : 'En Rango Seguro'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isDanger
                        ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                        : isWarning
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                    }`}
                  >
                    {percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDanger
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                {/* Amounts Breakdown */}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gastado:</span>
                    <span className="font-mono font-bold text-white">
                      {formatMoney(spentInCat, currentUser.homeCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Límite:</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={plansState[cat]}
                        onChange={(e) =>
                          setPlansState({ ...plansState, [cat]: e.target.value })
                        }
                        className="w-24 bg-slate-900/80 border border-white/10 rounded-xl px-2 py-1 text-right text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono font-semibold text-slate-400">
                        {formatMoney(limitAmount, currentUser.homeCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Alert Footer */}
              <div className="mt-4 pt-3 border-t border-white/5">
                {isDanger ? (
                  <div className="text-[11px] text-rose-300 flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                    <span>Exceso de {formatMoney(Math.abs(remaining), currentUser.homeCurrency)}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-cyan-300 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                    <span>Margen: {formatMoney(remaining, currentUser.homeCurrency)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
