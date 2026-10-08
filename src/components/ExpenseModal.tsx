import React, { useState, useEffect, useRef } from 'react';
import { 
  Receipt, 
  X, 
  Calendar, 
  DollarSign, 
  Tag, 
  Users, 
  FileText, 
  Sparkles, 
  Check, 
  Camera, 
  Upload, 
  Loader2, 
  TrendingUp, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  HelpCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Expense, Trip, CurrencyCode, ExpenseCategory, User, UserSubscription } from '../types';
import { ALL_CATEGORIES, CATEGORY_DETAILS, CURRENCIES, CURRENCIES_BY_REGION } from '../data/currencies';
import { convertToHomeCurrency, formatMoney } from '../utils/finance';
import { api } from '../utils/api';
import { hasTierAccess, hasUnlimitedAccess } from '../data/plans';

interface ExpenseModalProps {
  expense?: Expense | null;
  trip: Trip;
  currentUser: User;
  subscription: UserSubscription | null;
  onSave: (expenseData: Partial<Expense>) => void;
  onClose: () => void;
  onTriggerSecret: (msg: string) => void;
  onOpenUpgradeGate: (title: string, desc: string) => void;
  onShowToast: (msg: string, type: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  expense,
  trip,
  currentUser,
  subscription,
  onSave,
  onClose,
  onTriggerSecret,
  onOpenUpgradeGate,
  onShowToast,
}) => {
  const isPro = hasTierAccess(subscription, 'pro');

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

  // Business Trip Metadata (Premium)
  const [isTaxDeductible, setIsTaxDeductible] = useState<boolean>(expense?.isTaxDeductible !== false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(expense?.invoiceNumber || '');
  const [merchantName, setMerchantName] = useState<string>(expense?.merchantName || '');
  const [showBusinessFields, setShowBusinessFields] = useState<boolean>(!!(trip.isBusinessTrip || expense?.invoiceNumber || expense?.merchantName));

  // 1. OCR State
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Real-Time & Historical Exchange Rate State
  const [exchangeRateAtDate, setExchangeRateAtDate] = useState<number | null>(
    expense?.exchangeRateAtDate || null
  );
  const [fxRateProvider, setFxRateProvider] = useState<string>('');
  const [isLoadingFx, setIsLoadingFx] = useState(false);

  // Fetch historical / real-time FX rate when currency or date changes (Pro Feature)
  useEffect(() => {
    let isMounted = true;
    if (currency === currentUser.homeCurrency) {
      setExchangeRateAtDate(1.0);
      setFxRateProvider('Paridad 1:1');
      return;
    }

    if (isPro) {
      setIsLoadingFx(true);
      api.getHistoricalFxRate(currency, currentUser.homeCurrency, date)
        .then((res) => {
          if (isMounted && res.rate > 0) {
            setExchangeRateAtDate(res.rate);
            setFxRateProvider(res.provider === 'frankfurter' ? 'BCE (Histórica en vivo)' : 'Open Exchange Rates');
          }
        })
        .catch((err) => {
          console.warn('Could not fetch historical rate:', err);
          if (isMounted) {
            // Fallback to trip exchange rate
            setExchangeRateAtDate(trip.exchangeRate || 1.0);
            setFxRateProvider('Tasa de configuración del viaje');
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingFx(false);
        });
    } else {
      // Free plan uses static trip exchange rate
      setExchangeRateAtDate(trip.exchangeRate || 1.0);
      setFxRateProvider('Tasa Fija (Plan Básico)');
    }

    return () => {
      isMounted = false;
    };
  }, [currency, date, currentUser.homeCurrency, isPro, trip.exchangeRate]);

  // Calculate live conversion preview
  const numAmount = parseFloat(amount) || 0;
  const activeRate = (isPro && exchangeRateAtDate && exchangeRateAtDate > 0)
    ? (currency === currentUser.homeCurrency ? 1 : exchangeRateAtDate)
    : null;

  const convertedHome = activeRate 
    ? numAmount * activeRate 
    : convertToHomeCurrency(numAmount, currency, trip, currentUser.homeCurrency);

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

  // 1. OCR File Upload Handler
  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPro) {
      onOpenUpgradeGate(
        'Escaneo de Recibos con IA (OCR)',
        'Extrae automáticamente el total, nombre de la tienda, fecha y categoría desde la foto de tu recibo con Visión Multimodal. Exclusivo de planes Pro y Premium.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsScanningOcr(true);
    setOcrError(null);
    setOcrSuccessNotice(null);

    try {
      // Read file to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await api.scanReceiptOcr(base64Data, file.type || 'image/jpeg', trip.currency);
          if (res.success && res.result) {
            const data = res.result;
            if (data.title) setTitle(data.title);
            if (data.amount && data.amount > 0) setAmount(data.amount.toString());
            if (data.currency) setCurrency(data.currency);
            if (data.category && ALL_CATEGORIES.includes(data.category)) setCategory(data.category);
            if (data.date) setDate(data.date);
            if (data.detectedItems && data.detectedItems.length > 0) {
              setDetectedItems(data.detectedItems);
            }

            setOcrSuccessNotice(`¡Recibo leído con éxito! Revisa los datos y ajusta lo que necesites.`);
            onShowToast('Datos del recibo extraídos con IA. Por favor confirma los valores.', 'success');
          }
        } catch (err: any) {
          if (err.data?.missingApiKey) {
            setOcrError('No hay clave de API de Gemini (GEMINI_API_KEY) configurada en el servidor. Configúrala en AI Studio Secrets.');
          } else if (err.data?.code === 'PLAN_LIMIT_EXCEEDED') {
            onOpenUpgradeGate('Plan Pro Requerido', err.message);
          } else {
            setOcrError(err.message || 'Error al procesar el recibo.');
          }
        } finally {
          setIsScanningOcr(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsScanningOcr(false);
      setOcrError('No se pudo leer la imagen localmente.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    // Easter Egg
    const lowerTitle = title.trim().toLowerCase();
    if (lowerTitle === 'billete dorado' || lowerTitle === 'golden ticket' || lowerTitle === 'ticket dorado') {
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff', '#0284c7']
      });
      onTriggerSecret('🎟️ ¡Has desbloqueado el Billete Dorado! Cobertura de Cero Estrés Financiero.');
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
      exchangeRateAtDate: isPro && exchangeRateAtDate ? exchangeRateAtDate : undefined,
      exchangeRateDate: isPro ? date : undefined,
      isTaxDeductible,
      invoiceNumber: invoiceNumber.trim() || undefined,
      merchantName: merchantName.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101e] w-full max-w-lg rounded-[32px] p-6 sm:p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/5">
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
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRO FEATURE 1: OCR Receipt Scanner Bar */}
        <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/20 rounded-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                  Escaneo con OCR Inteligente
                  <span className="text-[9px] uppercase tracking-widest font-extrabold bg-blue-900/80 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-400/30">
                    Pro
                  </span>
                </span>
                <span className="text-[10.5px] text-slate-400">
                  Sube una foto de tu ticket para auto-rellenar monto y categoría.
                </span>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleOcrFileChange}
                className="hidden"
                id="receipt-ocr-upload"
              />
              <button
                type="button"
                disabled={isScanningOcr}
                onClick={() => {
                  if (!isPro) {
                    onOpenUpgradeGate(
                      'Escaneo de Recibos con OCR',
                      'Reconocimiento automático de recibos y facturas disponible para usuarios Pro y Premium.'
                    );
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white text-xs font-bold px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {isScanningOcr ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Leyendo ticket...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* OCR Error Callout */}
          {ocrError && (
            <div className="mt-2.5 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-200 text-[11px] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{ocrError}</span>
            </div>
          )}

          {/* OCR Success Notice */}
          {ocrSuccessNotice && (
            <div className="mt-2.5 p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-[11px] flex items-start space-x-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{ocrSuccessNotice}</span>
                {detectedItems.length > 0 && (
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    Ítems detectados: {detectedItems.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
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
                <optgroup label="Sugerencias Rápidas" className="bg-slate-900 text-cyan-400 font-bold">
                  <option value={trip.currency} className="bg-slate-950 text-white">
                    {CURRENCIES[trip.currency]?.flag} {trip.currency} ({CURRENCIES[trip.currency]?.symbol}) - Moneda Destino
                  </option>
                  <option value={currentUser.homeCurrency} className="bg-slate-950 text-white">
                    {CURRENCIES[currentUser.homeCurrency]?.flag} {currentUser.homeCurrency} ({CURRENCIES[currentUser.homeCurrency]?.symbol}) - Tu Moneda Base
                  </option>
                </optgroup>
                {CURRENCIES_BY_REGION.map((group) => (
                  <optgroup key={group.region} label={group.region} className="bg-slate-900 text-slate-300 font-semibold">
                    {group.currencies.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                        {c.flag} {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* PRO FEATURE 2 & 3: Live Conversion with Real-Time / Historical FX Rates */}
          {numAmount > 0 && (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-cyan-400 font-bold tracking-wider block">
                    Conversión a Tu Moneda ({currentUser.homeCurrency})
                  </span>
                  {isPro && (
                    <span className="text-[9px] bg-blue-900/80 text-cyan-300 px-1 rounded font-mono">
                      {isLoadingFx ? 'Calculando tasa...' : 'Historial en vivo'}
                    </span>
                  )}
                </div>
                <span className="text-base font-mono font-extrabold text-white">
                  {formatMoney(convertedHome, currentUser.homeCurrency)}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-300 font-mono block">
                  1 {currency} = {activeRate ? activeRate.toFixed(4) : trip.exchangeRate} {currentUser.homeCurrency}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center sm:justify-end gap-1">
                  <Clock className="w-3 h-3" /> {fxRateProvider}
                </span>
              </div>
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
                    <span>{member === 'Yo' ? `Yo (${currentUser.name})` : member}</span>
                  </button>
                );
              })}
            </div>

            {numAmount > 0 && (
              <div className="mt-3 p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Cuota por participante:</span>
                  <b className="text-cyan-300 font-mono text-xs">
                    {formatMoney(convertedHome / (splitBetween.length || 1), currentUser.homeCurrency)}
                  </b>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-snug pt-1 border-t border-white/5">
                  {splitBetween.length === 1 && splitBetween[0] === paidBy ? (
                    <span>• <b>Gasto individual:</b> {paidBy === 'Yo' ? 'Tú pagas y consumes' : `${paidBy} paga y consume`} el 100%. No genera deudas.</span>
                  ) : splitBetween.includes(paidBy) ? (
                    <span>
                      • <b>{paidBy === 'Yo' ? `Tú (Yo - ${currentUser.name})` : paidBy}</b> desembolsa {formatMoney(convertedHome, currentUser.homeCurrency)}. Los demás participantes seleccionados ({splitBetween.filter(m => m !== paidBy).map(m => m === 'Yo' ? `Yo (${currentUser.name})` : m).join(', ')}) le deberán <b>{formatMoney(convertedHome / (splitBetween.length || 1), currentUser.homeCurrency)}</b> cada uno a <b>{paidBy === 'Yo' ? currentUser.name : paidBy}</b>.
                    </span>
                  ) : (
                    <span>
                      • <b>{paidBy === 'Yo' ? `Tú (Yo - ${currentUser.name})` : paidBy}</b> pagó por el grupo sin participar del consumo. Todos los seleccionados le deben transferir su cuota a {paidBy === 'Yo' ? currentUser.name : paidBy}.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Business Trip & Tax Invoicing Fields (Premium / Corporate) */}
          <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>Datos Corporativos / Factura (Modo Empresa)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowBusinessFields(!showBusinessFields)}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                {showBusinessFields ? 'Ocultar' : 'Agregar factura/RUT'}
              </button>
            </div>

            {showBusinessFields && (
              <div className="space-y-2.5 pt-2 border-t border-white/5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Razón Social / Comercio:</label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      placeholder="Ej: LATAM Airlines / Hotel Ibis"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Nº Factura / Folio Boleta:</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej: F-104928"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxDeductible}
                    onChange={(e) => setIsTaxDeductible(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-white/20 focus:ring-0 cursor-pointer"
                  />
                  <span>Gasto deducible de impuestos / Reembolsable por la empresa</span>
                </label>
              </div>
            )}
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
