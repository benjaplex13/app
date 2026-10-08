import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  Check, 
  TrendingDown, 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Wallet, 
  Utensils, 
  Car, 
  Bed, 
  Plane, 
  Ticket, 
  ShoppingBag, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  Delete,
  SlidersHorizontal,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Expense, Trip, CurrencyCode, ExpenseCategory, User } from '../types';
import { CURRENCIES, CATEGORY_DETAILS } from '../data/currencies';
import { formatMoney } from '../utils/finance';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentUser: User;
  onSave: (expenseData: Partial<Expense>) => Promise<boolean> | boolean | void;
  onOpenFullForm?: () => void;
  onShowToast?: (msg: string, type: 'success' | 'warning' | 'info' | 'error') => void;
}

type QuickStep = 1 | 2 | 3 | 4 | 5 | 'success';

const POPULAR_SUGGESTIONS = [
  '☕ Café',
  '🍽️ Almuerzo',
  '🍷 Cena',
  '🚕 Taxi / Uber',
  '🚇 Metro / Bus',
  '🛒 Supermercado',
  '🎟️ Entrada / Tour',
  '💧 Agua / Snacks',
  '🏨 Hotel / Noche',
];

const PAYMENT_ACCOUNTS = [
  { id: 'Efectivo', label: 'Efectivo', icon: Banknote, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/30' },
  { id: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito', icon: CreditCard, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-950/40 border-cyan-500/30' },
  { id: 'Tarjeta de Débito', label: 'Tarjeta de Débito', icon: Wallet, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-950/40 border-blue-500/30' },
  { id: 'Transferencia / App', label: 'Transferencia / Digital', icon: Smartphone, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-950/40 border-purple-500/30' },
];

const CATEGORY_ICONS: Record<ExpenseCategory, React.ComponentType<{ className?: string }>> = {
  Comida: Utensils,
  Transporte: Car,
  Alojamiento: Bed,
  Actividades: Ticket,
  Compras: ShoppingBag,
  Vuelos: Plane,
  Seguro: ShieldCheck,
  Imprevistos: AlertCircle,
};

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUser,
  onSave,
  onOpenFullForm,
  onShowToast,
}) => {
  const [step, setStep] = useState<QuickStep>(1);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [transactionType, setTransactionType] = useState<'Gasto' | 'Ingreso'>('Gasto');
  const [account, setAccount] = useState('Tarjeta de Crédito');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset form whenever sheet is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTitle('');
      setAmountStr('');
      setTransactionType('Gasto');
      setAccount('Tarjeta de Crédito');
      setIsSubmitting(false);

      // Auto-focus input after transition
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCurrency = trip.currency || currentUser.homeCurrency || 'USD';
  const currencySymbol = CURRENCIES[currentCurrency]?.symbol || '$';

  // Handle Keypad clicks in Step 2
  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setAmountStr((prev) => prev.slice(0, -1));
    } else if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr((prev) => (prev ? prev + '.' : '0.'));
      }
    } else {
      // Prevent overly long numbers
      if (amountStr.length >= 10) return;
      if (amountStr === '0' && val !== '.') {
        setAmountStr(val);
      } else {
        setAmountStr((prev) => prev + val);
      }
    }
  };

  // Step 1 -> Step 2
  const handleStep1Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleStep2Submit = () => {
    const parsed = parseFloat(amountStr);
    if (!parsed || parsed <= 0) return;
    setStep(3);
  };

  // Step 3 -> Step 4
  const handleSelectType = (type: 'Gasto' | 'Ingreso') => {
    setTransactionType(type);
    setStep(4);
  };

  // Step 4 -> Step 5
  const handleSelectAccount = (selectedAccount: string) => {
    setAccount(selectedAccount);
    setStep(5);
  };

  // Step 5 -> Save and finish
  const handleSelectCategory = async (category: ExpenseCategory) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStep('success');

    const numAmount = parseFloat(amountStr) || 0;
    const finalAmount = transactionType === 'Ingreso' ? -Math.abs(numAmount) : Math.abs(numAmount);
    const cleanTitle = title.trim() || 'Gasto Rápido';
    const noteText = transactionType === 'Ingreso' 
      ? `Ingreso / Reembolso (${account})` 
      : `Cuenta: ${account}`;

    // Mini celebratory confetti burst
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#00f2fe', '#4facfe', '#38ef7d', '#ffffff'],
      });
    } catch {
      // Ignore in environments without canvas
    }

    try {
      const saved = await onSave({
        tripId: trip.id,
        title: cleanTitle,
        amount: finalAmount,
        currency: currentCurrency,
        category,
        date: new Date().toISOString().split('T')[0],
        paidBy: 'Yo',
        splitBetween: trip.members && trip.members.length > 0 ? trip.members : ['Yo'],
        notes: noteText,
      });

      if (saved === false) {
        setIsSubmitting(false);
        setStep(5);
        return;
      }

      if (onShowToast) {
        onShowToast(`¡${transactionType} registrado: ${formatMoney(Math.abs(numAmount), currentCurrency)}!`, 'success');
      }

      // Close after 500ms brief animated feedback
      setTimeout(() => {
        onClose();
      }, 550);
    } catch (err: any) {
      console.error('Error saving quick expense:', err);
      setIsSubmitting(false);
      setStep(5);
      if (onShowToast) {
        onShowToast(err.message || 'Error al guardar el gasto.', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Dark backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet / Modal Panel */}
      <div 
        id="quick-expense-bottom-sheet"
        className="relative z-10 w-full max-w-lg bg-[#070b16] border border-cyan-500/30 rounded-t-[32px] sm:rounded-[32px] shadow-2xl shadow-cyan-500/20 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300"
      >
        {/* Top Progress bar & Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-[#0b1329] via-[#071324] to-[#070b16]">
          {/* iOS Grabber for Mobile Sheet */}
          <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {step !== 1 && step !== 'success' && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof step === 'number' && step > 1) {
                      setStep((step - 1) as QuickStep);
                    }
                  }}
                  className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                  aria-label="Paso anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-cyan-400" />
                </button>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-md">
                  <div className="w-full h-full bg-[#070b16] rounded-[6px] flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                    Registro Rápido
                    <span className="text-[10px] text-cyan-400 font-mono font-semibold bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.2 rounded-full">
                      {currentCurrency}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {step === 'success' ? '¡Guardado!' : `Paso ${step} de 5 • ${trip.destination}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {onOpenFullForm && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullForm();
                  }}
                  className="text-[11px] text-slate-400 hover:text-cyan-300 font-medium px-2 py-1 rounded-lg hover:bg-white/5 transition flex items-center gap-1"
                  title="Abrir formulario detallado con notas, OCR y división"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span className="hidden sm:inline">Detallado</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Segmented Progress Indicators */}
          {step !== 'success' && (
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    (typeof step === 'number' && i <= step)
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm shadow-cyan-500/50'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col justify-center min-h-[340px]">
          {/* ============================================================
              PASO 1: Concepto / ¿Qué es?
          ============================================================ */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Paso 1</span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                  ¿Qué compraste o pagaste?
                </h2>
                <p className="text-xs text-slate-400">
                  Escribe el nombre o toca una sugerencia frecuente
                </p>
              </div>

              <div className="pt-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Café y croissant, Metro, Cena..."
                  className="w-full bg-slate-900/90 border-2 border-cyan-500/40 rounded-2xl px-4 py-3.5 text-lg sm:text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition shadow-inner text-center"
                  autoFocus
                />
              </div>

              {/* Quick suggestions pills for 1-tap entry */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                  Sugerencias rápidas
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 max-h-28 overflow-y-auto p-1">
                  {POPULAR_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        const clean = item.replace(/^[^\s]+\s/, '');
                        setTitle(clean);
                        setStep(2);
                      }}
                      className="text-xs bg-slate-900 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white px-3 py-1.5 rounded-full transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-cyan-500/20 transition active:scale-98 flex items-center justify-center space-x-2 text-base cursor-pointer"
                >
                  <span>Continuar al Monto</span>
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </form>
          )}

          {/* ============================================================
              PASO 2: Teclado Numérico Grande (Monto)
          ============================================================ */}
          {step === 2 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-center space-y-0.5">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                  Paso 2 • {title}
                </div>
                <h2 className="text-lg font-bold text-white">
                  Ingresa el monto
                </h2>
              </div>

              {/* Big amount display */}
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 text-center shadow-inner flex items-center justify-center space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">
                  {currencySymbol}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight min-h-[40px] flex items-center">
                  {amountStr || '0'}
                </span>
                <span className="text-xs text-slate-400 font-mono uppercase ml-1">
                  {currentCurrency}
                </span>
              </div>

              {/* iOS-Style Tactile Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className={`h-12 sm:h-14 rounded-2xl font-bold text-lg sm:text-xl transition active:scale-90 flex items-center justify-center select-none shadow-md ${
                      key === 'backspace'
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-rose-500/20 active:bg-rose-950'
                        : key === '.'
                        ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-white/10 text-2xl'
                        : 'bg-slate-900 hover:bg-slate-800 text-white border border-white/10 hover:border-cyan-500/30 text-xl'
                    }`}
                  >
                    {key === 'backspace' ? <Delete className="w-5 h-5" /> : key}
                  </button>
                ))}
              </div>

              {/* OK / Confirm button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="quick-amount-confirm-btn"
                  onClick={handleStep2Submit}
                  disabled={!amountStr || parseFloat(amountStr) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-cyan-500/25 transition active:scale-98 flex items-center justify-center space-x-2 text-base cursor-pointer"
                >
                  <Check className="w-5 h-5" />
                  <span>OK • Continuar ({currencySymbol} {amountStr || '0'})</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              PASO 3: Tipo de Movimiento (Gasto vs Ingreso)
          ============================================================ */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                  Paso 3 • {title} ({currencySymbol} {amountStr})
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                  ¿Es un Gasto o un Ingreso?
                </h2>
                <p className="text-xs text-slate-400">
                  Toca con el pulgar para continuar instantáneamente
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Botón Gasto */}
                <button
                  type="button"
                  id="quick-type-gasto-btn"
                  onClick={() => handleSelectType('Gasto')}
                  className="p-5 rounded-2xl bg-gradient-to-b from-rose-950/40 to-slate-900/90 border-2 border-rose-500/40 hover:border-rose-400 hover:scale-[1.02] active:scale-95 transition-all text-left shadow-lg flex items-center space-x-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 group-hover:bg-rose-500/30 transition">
                    <TrendingDown className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white group-hover:text-rose-200">
                      Gasto
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Salida de dinero, compras o consumos
                    </p>
                  </div>
                </button>

                {/* Botón Ingreso */}
                <button
                  type="button"
                  id="quick-type-ingreso-btn"
                  onClick={() => handleSelectType('Ingreso')}
                  className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900/90 border-2 border-emerald-500/40 hover:border-emerald-400 hover:scale-[1.02] active:scale-95 transition-all text-left shadow-lg flex items-center space-x-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white group-hover:text-emerald-200">
                      Ingreso
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Reembolso, dinero recibido o devolución
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              PASO 4: Selector de Cuenta / Método de Pago
          ============================================================ */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                  Paso 4 • {transactionType}: {currencySymbol} {amountStr}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                  ¿Con qué cuenta o método?
                </h2>
                <p className="text-xs text-slate-400">
                  Selecciona la cuenta con 1 toque
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {PAYMENT_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectAccount(acc.id)}
                      className={`p-4 rounded-2xl bg-gradient-to-r ${acc.bg} border hover:scale-[1.02] active:scale-95 transition-all text-left flex items-center space-x-3.5 shadow-md cursor-pointer group`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center shrink-0">
                        <Icon className={`w-5 h-5 ${acc.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white group-hover:text-cyan-200">
                          {acc.label}
                        </div>
                        <span className="text-[10px] text-slate-400">Tocar para seleccionar</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              PASO 5: Grilla de Categorías con Íconos (Autoguardado)
          ============================================================ */}
          {step === 5 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-center space-y-0.5">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                  Paso 5 • {title} ({currencySymbol} {amountStr})
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white font-display">
                  Elige la Categoría
                </h2>
                <p className="text-[11px] text-slate-400">
                  Toca una categoría para <strong className="text-cyan-300">guardar automáticamente</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {(Object.keys(CATEGORY_DETAILS) as ExpenseCategory[]).map((catKey) => {
                  const cat = CATEGORY_DETAILS[catKey];
                  const Icon = CATEGORY_ICONS[catKey] || Sparkles;

                  return (
                    <button
                      key={catKey}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectCategory(catKey)}
                      className={`p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-cyan-400/50 hover:bg-slate-800/90 hover:scale-105 active:scale-95 transition-all text-center flex flex-col items-center justify-center space-y-2 group shadow-md cursor-pointer ${cat.bg}`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate w-full">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              ESTADO DE ÉXITO (Animación breve ~0.5s)
          ============================================================ */}
          {step === 'success' && (
            <div className="text-center space-y-3 py-6 animate-in zoom-in-95 duration-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-bounce">
                <div className="w-full h-full bg-[#070b16] rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white font-display">
                  ¡Registrado al Instante!
                </h3>
                <p className="text-sm text-cyan-300 font-mono font-bold">
                  {title} • {formatMoney(parseFloat(amountStr) || 0, currentCurrency)}
                </p>
                <p className="text-xs text-slate-400">
                  Guardado en tu viaje de {trip.destination}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
