import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Filter, 
  ArrowUpDown, 
  Sparkles,
  Users,
  Download,
  Zap
} from 'lucide-react';
import { Expense, Trip, User, ExpenseCategory } from '../types';
import { ALL_CATEGORIES, CATEGORY_DETAILS } from '../data/currencies';
import { convertToHomeCurrency, formatMoney } from '../utils/finance';

interface ExpensesViewProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  onOpenAddModal: () => void;
  onOpenQuickModal?: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onTriggerSecret: (msg: string) => void;
  onOpenExportModal?: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  trip,
  expenses,
  currentUser,
  onOpenAddModal,
  onOpenQuickModal,
  onEditExpense,
  onDeleteExpense,
  onTriggerSecret,
  onOpenExportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPayer, setSelectedPayer] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    const clean = val.trim().toLowerCase();
    if (clean === 'viajero galactico' || clean === 'viajero galáctico' || clean === 'konami') {
      document.body.classList.add('animate-pulse');
      setTimeout(() => document.body.classList.remove('animate-pulse'), 2500);
      onTriggerSecret('🚀 ¡Modo Viajero Galáctico Activado! Rumbo hacia las estrellas sin límites de presupuesto.');
    }
  };

  // Filter and sort logic
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.paidBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;
    const matchesPayer = selectedPayer === 'ALL' || exp.paidBy === selectedPayer;

    return matchesSearch && matchesCategory && matchesPayer;
  });

  filteredExpenses.sort((a, b) => {
    const costA = convertToHomeCurrency(a.amount, a.currency, trip, currentUser.homeCurrency);
    const costB = convertToHomeCurrency(b.amount, b.currency, trip, currentUser.homeCurrency);

    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'amount-desc') return costB - costA;
    if (sortBy === 'amount-asc') return costA - costB;
    return 0;
  });

  const totalFilteredHome = filteredExpenses.reduce((acc, curr) => {
    return acc + convertToHomeCurrency(curr.amount, curr.currency, trip, currentUser.homeCurrency);
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" /> Registro Detallado de Gastos
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {filteredExpenses.length} movimientos • Total acumulado:{' '}
              <b className="text-blue-400 font-mono">{formatMoney(totalFilteredHome, currentUser.homeCurrency)}</b>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {onOpenQuickModal && (
              <button
                id="quick-expense-view-btn"
                onClick={onOpenQuickModal}
                className="bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black px-4 sm:px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-xl shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
                title="Registro Rápido en 5 toques estilo iOS"
              >
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>⚡ Rápido (10s)</span>
              </button>
            )}
            {onOpenExportModal && (
              <button
                onClick={onOpenExportModal}
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-3 rounded-2xl border border-white/10 flex items-center space-x-2 transition shadow-md"
                title="Exportar informe profesional a PDF, JSON o CSV"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Exportar</span>
              </button>
            )}
            <button
              id="add-expense-view-btn"
              onClick={onOpenAddModal}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-3 rounded-2xl flex items-center space-x-2 border border-white/10 shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Formulario completo con OCR y notas"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>+ Detallado</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/5 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              id="expense-search-input"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar gasto (o 'viajero galactico')..."
              className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-white text-xs focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-2.5 px-3.5 text-white text-xs focus:border-blue-500 focus:outline-none transition"
            >
              <option value="ALL">Todas las Categorías</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-950">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Payer Filter */}
          <div>
            <select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-2.5 px-3.5 text-white text-xs focus:border-blue-500 focus:outline-none transition"
            >
              <option value="ALL">Todos los Pagadores</option>
              {trip.members.map((m) => (
                <option key={m} value={m} className="bg-slate-950">
                  Pagado por: {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table / Cards */}
      <div className="bg-white/5 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1 font-display">No se encontraron gastos</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery || selectedCategory !== 'ALL' || selectedPayer !== 'ALL'
                ? 'Prueba modificando tus filtros o término de búsqueda.'
                : 'Aún no has registrado ningún gasto en este viaje.'}
            </p>
            <button
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition shadow-lg shadow-blue-600/20"
            >
              + Agregar el primer gasto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-white/5 text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Concepto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Pagador & Split</th>
                  <th className="p-4 text-right">Monto Original</th>
                  <th className="p-4 text-right">Moneda Base ({currentUser.homeCurrency})</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExpenses.map((exp) => {
                  const homeAmount = convertToHomeCurrency(exp.amount, exp.currency, trip, currentUser.homeCurrency);
                  const catDetail = CATEGORY_DETAILS[exp.category] || { label: exp.category, color: 'text-blue-400', bg: 'bg-blue-500/10' };

                  return (
                    <tr key={exp.id} className="hover:bg-white/5 transition">
                      {/* Date */}
                      <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                        {exp.date}
                      </td>

                      {/* Concept / Title */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${catDetail.bg}`}>
                          <span className={catDetail.color}>{catDetail.label}</span>
                        </span>
                      </td>

                      {/* Paid by & Split */}
                      <td className="p-4">
                        <div className="text-slate-200 font-medium">
                          Pagó: <b className="text-white">{exp.paidBy}</b>
                        </div>
                        {exp.splitBetween && exp.splitBetween.length > 0 && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3 text-blue-400" />
                            <span>Dividido entre: {exp.splitBetween.join(', ')}</span>
                          </div>
                        )}
                      </td>

                      {/* Original Amount */}
                      <td className="p-4 text-right font-mono font-semibold text-slate-300 whitespace-nowrap">
                        {formatMoney(exp.amount, exp.currency)}
                      </td>

                      {/* Converted Amount */}
                      <td className="p-4 text-right font-mono font-black text-cyan-400 whitespace-nowrap text-sm">
                        {formatMoney(homeAmount, currentUser.homeCurrency)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onEditExpense(exp)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-white/5 transition"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b101e] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-white">¿Eliminar gasto?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Se eliminará permanentemente "<span className="text-slate-200 font-semibold">{expenseToDelete.title}</span>" por {formatMoney(expenseToDelete.amount, expenseToDelete.currency)}.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = expenseToDelete.id;
                  setExpenseToDelete(null);
                  onDeleteExpense(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
