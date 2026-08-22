import React, { useState } from 'react';
import { 
  UserCog, 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  DollarSign, 
  ArrowRightLeft, 
  Download, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Crown,
  Zap,
  ArrowRight
} from 'lucide-react';
import { User, CurrencyCode, UserSubscription } from '../types';
import { CURRENCIES, CURRENCIES_BY_REGION } from '../data/currencies';
import { formatMoney } from '../utils/finance';

interface ProfileViewProps {
  currentUser: User;
  userSubscription?: UserSubscription | null;
  onOpenPlans?: () => void;
  onUpdateBaseCurrency: (currency: CurrencyCode) => void;
  onExportAllJSON: () => void;
  onOpenExportModal?: () => void;
  onShowToast: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  userSubscription,
  onOpenPlans,
  onUpdateBaseCurrency,
  onExportAllJSON,
  onOpenExportModal,
  onShowToast,
}) => {
  // Live Currency Converter state
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom] = useState<CurrencyCode>('USD');
  const [calcTo, setCalcTo] = useState<CurrencyCode>(currentUser.homeCurrency);

  const plan = userSubscription?.plan || 'free';
  const isPaid = plan !== 'free';

  // Conversion math using approx table
  const numAmt = parseFloat(calcAmount) || 0;
  const rateFrom = CURRENCIES[calcFrom]?.approxRateToUSD || 1;
  const rateTo = CURRENCIES[calcTo]?.approxRateToUSD || 1;
  // Convert from calcFrom -> USD -> calcTo
  const convertedResult = rateTo > 0 ? (numAmt * rateFrom) / rateTo : 0;

  const handleBaseCurrencyChange = (newCurr: CurrencyCode) => {
    onUpdateBaseCurrency(newCurr);
    onShowToast(`Moneda base cambiada a ${newCurr}. Todos los totales se han recalculado.`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="bg-white/5 p-6 sm:p-8 rounded-[32px] border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-600/30 border border-blue-400/30">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                {currentUser.name}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verificado
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentUser.email}</span>
            </p>
          </div>
        </div>

        {/* Plan & Home Currency Preference */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Plan badge box */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex items-center justify-between sm:justify-start gap-4">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Plan Actual</span>
              <span className="text-sm font-bold text-white uppercase flex items-center gap-1.5 mt-0.5">
                {plan === 'premium' ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : plan === 'pro' ? (
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Zap className="w-4 h-4 text-slate-400" />
                )}
                {plan.toUpperCase()}
              </span>
            </div>
            {onOpenPlans && (
              <button
                onClick={onOpenPlans}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
              >
                {isPaid ? 'Gestionar' : 'Mejorar'}
              </button>
            )}
          </div>

          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Moneda Base
            </label>
            <select
              value={currentUser.homeCurrency}
              onChange={(e) => handleBaseCurrencyChange(e.target.value as CurrencyCode)}
              className="w-full sm:w-60 bg-slate-900 border border-white/10 rounded-xl py-2 px-3 text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
            >
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
      </div>

      {/* Interactive Live Currency Converter Calculator */}
      <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 font-display">
          <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Calculadora Rápida de Conversión Multidivisa
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Amount and From */}
          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Monto a Convertir</label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="any"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
              <select
                value={calcFrom}
                onChange={(e) => setCalcFrom(e.target.value as CurrencyCode)}
                className="bg-slate-900 border border-white/10 rounded-2xl px-3 text-white text-xs focus:border-blue-500 focus:outline-none"
              >
                {CURRENCIES_BY_REGION.map((group) => (
                  <optgroup key={group.region} label={group.region} className="bg-slate-900 text-slate-300 font-semibold">
                    {group.currencies.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                        {c.flag} {c.code} ({c.symbol})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Convertir A</label>
            <select
              value={calcTo}
              onChange={(e) => setCalcTo(e.target.value as CurrencyCode)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
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

          {/* Live Result Box */}
          <div className="p-5 bg-blue-950/40 border border-blue-500/30 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Resultado Equivalente</span>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
              {formatMoney(convertedResult, calcTo)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Tasa: 1 {calcFrom} ≈ {(rateFrom / rateTo).toFixed(4)} {calcTo}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Data Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Privacy & Isolation Info */}
        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-4 text-xs">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-display">
            <Lock className="w-4 h-4 text-emerald-400" /> Aislamiento de Datos & Privacidad
          </h3>
          <p className="text-slate-300 leading-relaxed">
            Tu información financiera está encriptada y vinculada de forma exclusiva a tu identificador de usuario (<b className="font-mono text-cyan-400">{currentUser.id}</b>).
          </p>
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 text-slate-400 text-[11px] space-y-1.5">
            <div>• Cierre de sesión automático tras 15 min de inactividad.</div>
            <div>• Contraseñas protegidas mediante algoritmos de derivación unidireccional.</div>
            <div>• Verificación OTP obligatoria por correo para prevenir suplantaciones.</div>
          </div>
        </div>

        {/* Data Export Card */}
        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-4 text-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2 font-display">
              <Download className="w-4 h-4 text-blue-400" /> Exportar y Respaldar Viajes
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Genera informes ejecutivos en PDF de alta presentación con análisis y resumen financiero elaborado por Inteligencia Artificial, o descarga tu portafolio completo en formato JSON estructurado y planillas CSV.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {onOpenExportModal && (
              <button
                onClick={onOpenExportModal}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Exportar Informe PDF / JSON / CSV</span>
              </button>
            )}
            <button
              onClick={onExportAllJSON}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold py-2.5 rounded-xl border border-white/10 flex items-center justify-center space-x-2 transition text-xs"
            >
              <span>Descarga Rápida de Respaldo JSON (v2.1)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
