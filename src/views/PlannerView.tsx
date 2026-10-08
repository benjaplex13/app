import React, { useState } from 'react';
import { 
  Calculator, 
  Save, 
  TrendingDown, 
  TrendingUp, 
  Sparkles, 
  FileText,
  DollarSign
} from 'lucide-react';
import { Trip, Expense, User, ExpenseCategory, PlanItem } from '../types';
import { ALL_CATEGORIES, CATEGORY_DETAILS } from '../data/currencies';
import { convertToHomeCurrency, formatMoney, getCategoryBreakdown } from '../utils/finance';

interface PlannerViewProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  onSavePlans: (plans: PlanItem[]) => void;
  onShowToast: (msg: string, type: 'success' | 'info') => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  trip,
  expenses,
  currentUser,
  onSavePlans,
  onShowToast,
}) => {
  const [plansState, setPlansState] = useState<Record<ExpenseCategory, { amount: string; notes: string }>>(() => {
    const map: Record<string, { amount: string; notes: string }> = {};
    ALL_CATEGORIES.forEach((cat) => {
      const found = (trip.plans || []).find((p) => p.category === cat);
      map[cat] = {
        amount: found ? found.estimatedAmount.toString() : Math.round(trip.budget / ALL_CATEGORIES.length).toString(),
        notes: found?.notes || '',
      };
    });
    return map as Record<ExpenseCategory, { amount: string; notes: string }>;
  });

  const categoryBreakdown = getCategoryBreakdown(expenses, trip, currentUser.homeCurrency);

  // Total estimated vs total real
  const planList = Object.values(plansState) as { amount: string; notes: string }[];
  const totalEstimated: number = planList.reduce((acc: number, p) => acc + (parseFloat(p.amount) || 0), 0);
  const totalRealSpent = expenses.reduce((acc, curr) => {
    return acc + convertToHomeCurrency(curr.amount, curr.currency, trip, currentUser.homeCurrency);
  }, 0);
  const totalVariance = totalEstimated - totalRealSpent;

  const handleSave = () => {
    const newPlans: PlanItem[] = ALL_CATEGORIES.map((cat) => ({
      id: 'pl_' + cat,
      category: cat,
      estimatedAmount: parseFloat(plansState[cat].amount) || 0,
      notes: plansState[cat].notes,
    }));

    onSavePlans(newPlans);
    onShowToast('Estimaciones del plan previo guardadas correctamente.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" /> Planificación Previa vs Gasto Real
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Estima tus gastos antes de viajar y compara la desviación en tiempo real con tus desembolsos reales.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Estimaciones</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block">Total Estimado</span>
          <div className="text-2xl font-mono font-black text-white mt-1">
            {formatMoney(totalEstimated, currentUser.homeCurrency)}
          </div>
        </div>

        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block">Total Real Ejecutado</span>
          <div className="text-2xl font-mono font-black text-cyan-400 mt-1">
            {formatMoney(totalRealSpent, currentUser.homeCurrency)}
          </div>
        </div>

        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block">Desviación Neta</span>
          <div
            className={`text-2xl font-mono font-black mt-1 ${
              totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalVariance >= 0
              ? `+${formatMoney(totalVariance, currentUser.homeCurrency)} (Ahorro)`
              : `${formatMoney(totalVariance, currentUser.homeCurrency)} (Exceso)`}
          </div>
        </div>
      </div>

      {/* Categories Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_CATEGORIES.map((cat) => {
          const planData = plansState[cat];
          const estimatedNum = parseFloat(planData.amount) || 0;
          const realNum = categoryBreakdown[cat] || 0;
          const diff = estimatedNum - realNum;
          const details = CATEGORY_DETAILS[cat];

          return (
            <div
              key={cat}
              className="bg-white/5 p-6 rounded-[28px] border border-white/5 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Category Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${details.bg}`}>
                      <span className={details.color}>●</span>
                    </div>
                    <span className="text-xs font-bold text-white">{details.label}</span>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold flex items-center gap-1 ${
                      diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {diff >= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    <span>{diff >= 0 ? `+${formatMoney(diff, currentUser.homeCurrency)} margen` : `${formatMoney(diff, currentUser.homeCurrency)} exceso`}</span>
                  </span>
                </div>

                {/* Inputs & Values */}
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400">Presupuesto Estimado:</label>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[11px]">{currentUser.homeCurrency}</span>
                      <input
                        type="number"
                        step="any"
                        value={planData.amount}
                        onChange={(e) =>
                          setPlansState({
                            ...plansState,
                            [cat]: { ...planData, amount: e.target.value },
                          })
                        }
                        className="w-28 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-right text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gasto Real Ejecutado:</span>
                    <span className="font-mono font-bold text-white">
                      {formatMoney(realNum, currentUser.homeCurrency)}
                    </span>
                  </div>

                  {/* Notes / Plan details */}
                  <div className="pt-2">
                    <input
                      type="text"
                      value={planData.notes}
                      onChange={(e) =>
                        setPlansState({
                          ...plansState,
                          [cat]: { ...planData, notes: e.target.value },
                        })
                      }
                      placeholder="Notas de previsión (ej: 4 noches en hotel + tasas)..."
                      className="w-full bg-slate-900/40 border border-white/5 rounded-xl px-3 py-2 text-slate-300 text-[11px] focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
