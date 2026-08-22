import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  Crown, 
  X, 
  ArrowRight, 
  Zap, 
  AlertCircle,
  HelpCircle,
  Clock,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, PlanTier, BillingCycle, UserSubscription } from '../types';
import { PLANS_DATA } from '../data/plans';
import { api } from '../utils/api';

// ============================================================================
// TEMPORARY DEMO MODE FLAG
// When true: Instantly auto-activates plan on checkout opening without waiting
// for real Flow.cl payment gateway processing.
// Easily toggle this to false or remove once Flow production credentials are live.
// ============================================================================
export const DEMO_AUTO_ACTIVATE_MODE = true;

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  plan: PlanTier;
  billingCycle: BillingCycle;
  onSuccess: (subscription: UserSubscription) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  plan,
  billingCycle,
  onSuccess,
  onShowToast,
}) => {
  const [cardHolder, setCardHolder] = useState(currentUser.name || '');
  const [cardEmail, setCardEmail] = useState(currentUser.email || '');
  const [cardNumber, setCardNumber] = useState('4532 8921 7382 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('843');
  
  // Checkout activation status
  const [activationState, setActivationState] = useState<'authorizing' | 'activated' | 'error'>('authorizing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPlanData = PLANS_DATA.find((p) => p.id === plan) || PLANS_DATA[1];
  const price = billingCycle === 'annual' ? selectedPlanData.priceAnnualCLP : selectedPlanData.priceMonthlyCLP;
  const formattedPrice = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);

  useEffect(() => {
    if (!isOpen) {
      setActivationState('authorizing');
      setErrorMessage(null);
      return;
    }

    // Auto-fill user information
    setCardHolder(currentUser.name || '');
    setCardEmail(currentUser.email || '');

    // ============================================================================
    // DEMO AUTO-ACTIVATION: Triggered immediately when entering the checkout screen
    // ============================================================================
    if (DEMO_AUTO_ACTIVATE_MODE) {
      let isMounted = true;

      const performDemoActivation = async () => {
        setActivationState('authorizing');
        try {
          // Slight delay of 700ms for realistic visual UX flow
          await new Promise((resolve) => setTimeout(resolve, 700));

          const res = await api.activateDemoSubscription(plan, billingCycle);

          if (!isMounted) return;

          setActivationState('activated');
          onSuccess(res.subscription);

          // Trigger celebratory confetti
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00f0ff', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
          });

          onShowToast(`¡Plan ${plan.toUpperCase()} activado en modo demo con éxito!`, 'success');
        } catch (err: any) {
          if (!isMounted) return;
          console.error('Error in demo activation:', err);
          setActivationState('error');
          setErrorMessage(err.message || 'Error al activar plan en modo demo.');
        }
      };

      performDemoActivation();

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, plan, billingCycle, currentUser, onSuccess, onShowToast]);

  if (!isOpen) return null;

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

        {/* Demo Mode Notice Alert */}
        <div className="mb-6 bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/40 rounded-2xl p-4 flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-200 leading-relaxed">
            <p className="font-bold text-white mb-0.5">
              ⚡ Activación Instantánea de Prueba (Modo Demo)
            </p>
            <p className="text-slate-300">
              Al ingresar a este checkout, el plan <strong className="text-cyan-300">Rumbio {selectedPlanData.name}</strong> se ha activado automáticamente en tu cuenta para que puedas probar todas las funciones premium de inmediato sin realizar cargos a tu tarjeta.
            </p>
          </div>
        </div>

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
                  <span>Descuento Modo Demo</span>
                  <span className="font-semibold">-$0 CLP</span>
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

            {/* Live Activation Status Box */}
            <div className={`p-3.5 rounded-xl border text-xs transition-all ${
              activationState === 'activated'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : activationState === 'error'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
            }`}>
              {activationState === 'authorizing' && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span className="font-medium">Autorizando activación instantánea...</span>
                </div>
              )}
              {activationState === 'activated' && (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">¡Plan Activo! Disfruta todas las ventajas.</span>
                </div>
              )}
              {activationState === 'error' && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Checkout Form (Pre-populated Realistic Input Fields) */}
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
                Información de Tarjeta de Crédito / Débito
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

            {/* Action buttons */}
            <div className="pt-3 space-y-2">
              <button
                id="checkout-confirm-btn"
                onClick={onClose}
                className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 px-6 rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
              >
                <span>{activationState === 'activated' ? `Completar y Usar Plan ${selectedPlanData.name}` : 'Finalizar Activación Demo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-[11px] text-slate-400">
                🔒 Transacción simulada sin cobro real • Garantía de cancelación en cualquier momento
              </p>
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
      </div>
    </div>
  );
};
