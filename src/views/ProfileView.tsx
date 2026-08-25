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
  ArrowRight,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  FileText,
  Cookie,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { User, CurrencyCode, UserSubscription } from '../types';
import { CURRENCIES, CURRENCIES_BY_REGION } from '../data/currencies';
import { formatMoney } from '../utils/finance';
import { api } from '../utils/api';
import { LegalTab } from '../components/LegalModal';

interface ProfileViewProps {
  currentUser: User;
  userSubscription?: UserSubscription | null;
  onOpenPlans?: () => void;
  onRefreshSubscription?: (updatedSub?: UserSubscription) => Promise<any>;
  onUpdateBaseCurrency: (currency: CurrencyCode) => void;
  onExportAllJSON: () => void;
  onOpenExportModal?: () => void;
  onOpenLegal?: (tab: LegalTab) => void;
  onShowToast: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  userSubscription,
  onOpenPlans,
  onRefreshSubscription,
  onUpdateBaseCurrency,
  onExportAllJSON,
  onOpenExportModal,
  onOpenLegal,
  onShowToast,
}) => {
  // Live Currency Converter state
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom] = useState<CurrencyCode>('USD');
  const [calcTo, setCalcTo] = useState<CurrencyCode>(currentUser.homeCurrency);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const plan = userSubscription?.plan || 'free';
  const isPaid = plan !== 'free';
  const isCanceled = userSubscription?.status === 'canceled';

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const res = await api.cancelSubscription();
      if (onRefreshSubscription) {
        await onRefreshSubscription(res.subscription);
      }
      setShowCancelConfirm(false);
      onShowToast(res.message || 'Suscripción cancelada.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Error al cancelar la suscripción.', 'error');
    } finally {
      setCanceling(false);
    }
  };

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
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-4">
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
                  {isPaid ? 'Ver Planes' : 'Mejorar'}
                </button>
              )}
            </div>

            {/* If paid and active, show Cancel button */}
            {isPaid && userSubscription?.status === 'active' && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition self-start"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar plan</span>
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

      {/* Subscription Canceled Banner if paid in grace period */}
      {isPaid && isCanceled && (
        <div className="bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-[#070b16] border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 animate-fadeIn">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-white">Estado de tu Suscripción: Cancelada</h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {userSubscription?.currentPeriodEnd ? (
                <>
                  Tu plan <b>{plan.toUpperCase()}</b> sigue activo hasta el{' '}
                  <b>
                    {new Date(userSubscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </b>
                  , después pasarás a Gratis automáticamente.
                </>
              ) : (
                <>Tu suscripción fue cancelada y tu cuenta pasará al plan Gratis automáticamente.</>
              )}
            </p>
          </div>
        </div>
      )}

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

      {/* Trust, Legal & Direct Support Center */}
      <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-display">
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Centro de Confianza, Legal & Soporte
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Políticas transparentes, soporte directo con el desarrollador y gestión clara de tus datos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Privacy Policy */}
          <div className="p-5 bg-slate-900/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-cyan-500/30 transition group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                Política de Privacidad
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Datos guardados en Supabase, cero venta a terceros y derecho total a eliminar tu cuenta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('privacy')}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <span>Ver política</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          {/* Card 2: Terms & Conditions */}
          <div className="p-5 bg-slate-900/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-cyan-500/30 transition group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                Términos y Condiciones
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Planes con cancelación instantánea sin penalización y uso honesto del servicio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('terms')}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <span>Ver términos</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          {/* Card 3: Contact & Support */}
          <div className="p-5 bg-slate-900/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-cyan-500/30 transition group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Mail className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                Contacto & Soporte
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Escribe a <span className="text-cyan-300 font-mono">benchomateosa@gmail.com</span> para cualquier consulta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('contact')}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <span>Contactar</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          {/* Card 4: Cookies & Storage */}
          <div className="p-5 bg-slate-900/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-cyan-500/30 transition group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Cookie className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                Cookies & Caché
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Almacenamiento técnico local para modo offline PWA y sesión. Cero rastreo publicitario.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('cookies')}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <span>Ver detalles</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#070b16] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold font-display text-white">
              ¿Seguro que quieres cancelar tu plan {plan.toUpperCase()}?
            </h3>
            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
              {userSubscription?.currentPeriodEnd ? (
                <>
                  Mantendrás tu plan <b className="text-white">{plan.toUpperCase()}</b> activo hasta el{' '}
                  <b className="text-cyan-300">
                    {new Date(userSubscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </b>
                  . Después pasarás al plan Gratis automáticamente sin cobros adicionales.
                </>
              ) : (
                <>Tu cuenta pasará al plan Gratis de inmediato. Mantendrás todos tus viajes y datos históricos intactos.</>
              )}
            </p>

            <div className="mt-6 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
              >
                Mantener mi plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20"
              >
                {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirmar cancelación</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
