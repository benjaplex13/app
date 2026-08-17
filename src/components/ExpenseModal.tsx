import React, { useState } from 'react';
import { Receipt, X, Calendar, DollarSign, Tag, Users, FileText, Sparkles, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Expense, Trip, CurrencyCode, ExpenseCategory, User } from '../types';
import { ALL_CATEGORIES, CATEGORY_DETAILS, CURRENCIES } from '../data/currencies';
import { convertToHomeCurrency, formatMoney } from '../utils/finance';

interface ExpenseModalProps {
  expense?: Expense | null;
  trip: Trip;
  currentUser: User;
  onSave: (expenseData: Partial<Expense>) => void;
  onClose: () => void;
  onTriggerSecret: (msg: string) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  expense,
  trip,
  currentUser,
  onSave,
  onClose,
  onTriggerSecret,
}) => {
  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense ? expense.amount.toString() : '');
  const [currency, setCurrency] = useState<CurrencyCode>(expense?.currency || trip.currency);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || 'Comida');
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(expense?.paidBy || 'Yo');
  const [splitBetween, setSplitBetween] = useState<string[]>(
    expense?.splitBetween && expense.splitBetween.length > 0 
      ? expense.splitBetween 
      : (trip.members.length > 0 ? trip.members : ['Yo'])
  );
  const [notes, setNotes] = useState(expense?.notes || '');

  // Calculate live conversion preview
  const numAmount = parseFloat(amount) || 0;
  const convertedHome = convertToHomeCurrency(numAmount, currency, trip, currentUser.homeCurrency);

  const toggleSplitMember = (member: string) => {
    if (splitBetween.includes(member)) {
      if (splitBetween.length > 1) {
        setSplitBetween(splitBetween.filter(m => m !== member));
      }
    } else {
      setSplitBetween([...splitBetween, member]);
    }
  };

  const selectAllMembers = () => {
    setSplitBetween(trip.members.length > 0 ? trip.members : ['Yo']);
  };

  const selectOnlyMe = () => {
    setSplitBetween(['Yo']);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    // Check for Easter Egg: Golden Ticket
    const lowerTitle = title.trim().toLowerCase();
    if (lowerTitle === 'billete dorado' || lowerTitle === 'golden ticket' || lowerTitle === 'ticket dorado') {
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff', '#0284c7']
      });
      onTriggerSecret('🎟️ ¡Has desbloqueado el Billete Dorado! Viaje con cobertura de Cero Estrés Financiero.');
    }

    onSave({
      title: title.trim(),
      amount: parseFloat(amount),
      currency,
      category,
      date,
      paidBy: paidBy.trim() || 'Yo',
      splitBetween: splitBetween.length > 0 ? splitBetween : ['Yo'],
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101e] w-full max-w-lg rounded-[32px] p-6 sm:p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-white/5">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">
                {expense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
              </h3>
              <p className="text-xs text-slate-400">{trip.name} • {trip.destination}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-widest text-[11px]">
              Concepto / Nombre del Gasto
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Cena en Osteria da Fortunata"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Monto Gastado
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="45.50"
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px]">
                Moneda del Pago
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value={trip.currency}>
                  {CURRENCIES[trip.currency]?.flag} {trip.currency} (Moneda Destino)
                </option>
                <option value={currentUser.homeCurrency}>
                  {CURRENCIES[currentUser.homeCurrency]?.flag} {currentUser.homeCurrency} (Tu Moneda Base)
                </option>
                {Object.values(CURRENCIES)
                  .filter(c => c.code !== trip.currency && c.code !== currentUser.homeCurrency)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} - {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Live Conversion Callout */}
          {numAmount > 0 && (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-cyan-400 font-bold tracking-wider block">Conversión a Tu Moneda</span>
                <span className="text-base font-mono font-extrabold text-white">
                  {formatMoney(convertedHome, currentUser.homeCurrency)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 text-right">
                1 {trip.currency} = {trip.exchangeRate} {currentUser.homeCurrency}
              </span>
            </div>
          )}

          {/* Category Badges */}
          <div>
            <label className="block text-slate-400 font-semibold mb-2 text-[11px] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" /> Categoría
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const details = CATEGORY_DETAILS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-white font-bold shadow-md'
                        : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-[11px] ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-300'}`}>
                      {details.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Fecha del Gasto
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" /> ¿Quién Pagó?
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white focus:border-blue-500 focus:outline-none"
              >
                {trip.members.map((m) => (
                  <option key={m} value={m}>
                    {m === 'Yo' ? `Yo (${currentUser.name})` : m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Among Members Multi-Select */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Dividir Gasto Entre:
              </label>
              <div className="space-x-1.5">
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Todos
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={selectOnlyMe}
                  className="text-[10px] text-slate-400 hover:underline"
                >
                  Solo Yo
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {trip.members.map((member) => {
                const isChecked = splitBetween.includes(member);
                return (
                  <button
                    key={member}
                    type="button"
                    onClick={() => toggleSplitMember(member)}
                    className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition border ${
                      isChecked
                        ? 'bg-blue-600/30 border-blue-500 text-cyan-200 font-semibold'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${isChecked ? 'bg-blue-500 text-white' : 'border border-slate-700'}`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{member}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5">
              Cuota estimada por persona: <b className="text-white">{formatMoney(convertedHome / (splitBetween.length || 1), currentUser.homeCurrency)}</b>
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Notas / Detalles adicionales
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pagado con tarjeta de débito, incluye propina"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{expense ? 'Guardar Cambios' : 'Registrar Gasto'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
