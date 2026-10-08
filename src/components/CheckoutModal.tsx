import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  Crown, 
  X, 
  ArrowRight, 
  Zap, 
  AlertCircle,
  Loader2,
  Lock,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, PlanTier, BillingCycle, UserSubscription } from '../types';
import { PLANS_DATA } from '../data/plans';
import { api } from '../utils/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  plan: PlanTier;
  billingCycle: BillingCycle;
  onSuccess: (subscription: UserSubscription) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onCancelPlanClick?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  plan,
  billingCycle,
  onSuccess,
  onShowToast,
  onCancelPlanClick,
}) => {
  const [cardHolder, setCardHolder] = useState(currentUser.name || '');
  const [cardEmail, setCardEmail] = useState(currentUser.email || '');
  const [cardNumber, setCardNumber] = useState('4532 8921 7382 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('843');
  
  // Checkout activation status
  const [isActivating, setIsActivating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPlanData = PLANS_DATA.find((p) => p.id === plan) || PLANS_DATA[1];
  const price = billingCycle === 'annual' ? selectedPlanData.priceAnnualCLP : selectedPlanData.priceMonthlyCLP;
  const formattedPrice = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);

  if (!isOpen) return null;

  const handleConfirmActivation = async () => {
    if (isActivating || isSuccess) return;

    setIsActivating(true);
    setErrorMessage(null);

    try {
      // 1. Call real backend endpoint to activate plan
      const res = await api.activateDemoSubscription(plan, billingCycle);

      // 2. Mark success
      setIsSuccess(true);
      setIsActivating(false);

      // 3. Update React state immediately across the app
      if (res && res.subscription) {
        onSuccess(res.subscription);
      }

      // 4. Trigger celebratory confetti
      confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });

      // 5. Toast notification
      onShowToast(`¡Plan ${selectedPlanData.name} activado con éxito en tu cuenta!`, 'success');
    } catch (err: any) {
      console.error('Error activating subscription in checkout:', err);
      setIsActivating(false);
      const msg = err.message || 'No se pudo activar el plan. Por favor reintenta.';
      setErrorMessage(msg);
      onShowToast(msg, 'error');
    }
  };

  return (
    <div
      id="checkout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="checkout-modal-container"
        className="relative w-full max-w-2xl bg-[#070b16] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 text-white overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition z-10"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Demo Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-white">Pasarela de Pago Segura</h3>
              <p className="text-xs text-slate-400">Checkout cifrado SSL de 256 bits</p>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>MODO DEMO SANDBOX</span>
          </div>
        </div>

        {/* Success Screen if already activated */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-2xl font-extrabold text-white font-display">
                ¡Plan {selectedPlanData.name} Activado!
              </h4>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
                Tu cuenta ha sido actualizada con éxito. Ya puedes disfrutar de viajes ilimitados, analítica avanzada y todas las herramientas exclusivas.
              </p>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 max-w-md mx-auto text-left flex items-center space-x-3 text-xs text-emerald-200">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Suscripción activa y sincronizada en tiempo real con la base de datos de Rumbio.</span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="checkout-success-continue-btn"
                onClick={onClose}
                className="bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold py-3.5 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 inline-flex items-center space-x-2 transition active:scale-95 text-sm"
              >
                <span>Empezar a Usar Rumbio {selectedPlanData.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Demo Mode Notice Alert */}
            <div className="mb-6 bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/40 rounded-2xl p-4 flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-200 leading-relaxed">
                <p className="font-bold text-white mb-0.5">
                  ⚡ Activación de Prueba Inmediata (Modo Demo)
                </p>
                <p className="text-slate-300">
                  Presiona <strong className="text-cyan-300 font-bold">"Confirmar y Activar Plan"</strong> para activar inmediatamente <strong className="text-white">Rumbio {selectedPlanData.name}</strong> en tu cuenta sin realizar cargos reales a tu tarjeta.
                </p>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="mb-5 bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 flex items-start space-x-3 text-rose-200 text-xs animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold text-white">Error al procesar la activación</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Order & Payment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Order Summary */}
              <div className="md:col-span-5 bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                    Resumen de Orden
                  </span>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center space-x-1.5">
                        <span>Rumbio {selectedPlanData.name}</span>
                        {plan === 'premium' ? (
                          <Crown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 capitalize">
                        Ciclo {billingCycle === 'annual' ? 'Anual (Ahorro 2 meses)' : 'Mensual'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">{formattedPrice}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Modo Demo Sandbox</span>
                      <span className="font-semibold">Simulado ($0)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Impuestos (IVA 19%)</span>
                      <span>Incluido</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                      <span>Total a Pagar</span>
                      <span className="text-cyan-400 text-base">{formattedPrice} CLP</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-400 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Sin cobro real. Cancelable en cualquier momento.</span>
                </div>
              </div>

              {/* Right Column: Checkout Form (Pre-populated Input Fields) */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Nombre y Apellidos"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico de Facturación
                  </label>
                  <input
                    type="email"
                    value={cardEmail}
                    onChange={(e) => setCardEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Información de Tarjeta (Demo)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 0000 0000 0000"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                    />
                    <div className="absolute right-3 top-2.5 flex items-center space-x-1 text-slate-400">
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Vencimiento (MM/AA)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="843"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>

                {/* Compliance Subscription Notice */}
                <div id="checkout-subscription-compliance-notice" className="text-[11px] text-slate-300 bg-slate-900/90 border border-cyan-500/20 rounded-xl p-3 leading-relaxed text-center">
                  Al confirmar, aceptas que <strong className="text-white font-semibold">Rumbio {selectedPlanData.name}</strong> es una suscripción de renovación automática <strong className="text-cyan-300 font-semibold">{billingCycle === 'annual' ? 'anual' : 'mensual'}</strong>. Puedes{' '}
                  <button
                    type="button"
                    id="checkout-cancel-plan-link"
                    onClick={() => {
                      if (onCancelPlanClick) {
                        onCancelPlanClick();
                      } else {
                        onClose();
                      }
                    }}
                    className="text-cyan-400 font-bold underline underline-offset-2 hover:text-cyan-300 transition cursor-pointer"
                  >
                    cancelarla
                  </button>{' '}
                  en cualquier momento desde tu perfil, sin cargos adicionales.
                </div>

                {/* Action buttons */}
                <div className="pt-1 space-y-2">
                  <button
                    type="button"
                    id="checkout-confirm-btn"
                    onClick={handleConfirmActivation}
                    disabled={isActivating}
                    className={`w-full font-bold py-3.5 px-6 rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition active:scale-[0.98] ${
                      isActivating
                        ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-500/25'
                    }`}
                  >
                    {isActivating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activando Plan en Cuenta...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirmar y Activar Plan {selectedPlanData.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isActivating}
                    className="w-full text-xs text-slate-400 hover:text-white py-1.5 transition text-center"
                  >
                    Cancelar y volver
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Security Badges */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Encriptación bancaria SSL de extremo a extremo</span>
              </div>
              <div className="flex items-center space-x-3">
                <span>Webpay Plus</span>
                <span>•</span>
                <span>Flow.cl Sandbox</span>
                <span>•</span>
                <span>Visa / Mastercard</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

