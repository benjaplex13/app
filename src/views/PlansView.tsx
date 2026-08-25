import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserSubscription, PlanTier, BillingCycle, User } from '../types';
import { PLANS, PLAN_LIMITS } from '../data/plans';
import { api } from '../utils/api';
import { CheckoutModal, DEMO_AUTO_ACTIVATE_MODE } from '../components/CheckoutModal';
import { LegalTab } from '../components/LegalModal';

interface PlansViewProps {
  currentUser: User;
  subscription: UserSubscription | null;
  onRefreshSubscription: (updatedSub?: UserSubscription) => Promise<any>;
  onTriggerToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenLegal?: (tab: LegalTab) => void;
  onNavigateToProfile?: () => void;
}

export const PlansView: React.FC<PlansViewProps> = ({
  currentUser,
  subscription,
  onRefreshSubscription,
  onTriggerToast,
  onOpenLegal,
  onNavigateToProfile,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanTier | null>(null);

  const currentPlan = subscription?.plan || 'free';
  const isPaidActive = currentPlan !== 'free' && subscription?.status === 'active';
  const isCanceled = subscription?.status === 'canceled';

  const handleCancelPlanLinkClick = () => {
    setCheckoutPlan(null);
    if (isPaidActive) {
      setShowCancelConfirm(true);
    } else if (onNavigateToProfile) {
      onNavigateToProfile();
      onTriggerToast('Desde tu perfil podrás gestionar o cancelar tu suscripción en cualquier momento con un solo clic.', 'info');
    } else {
      setShowCancelConfirm(true);
    }
  };

  const handleSelectPlan = async (planTier: PlanTier) => {
    if (planTier === 'free') {
      if (isPaidActive) {
        setShowCancelConfirm(true);
      }
      return;
    }

    if (currentPlan === planTier && subscription?.status === 'active') {
      onTriggerToast(`Ya tienes el plan ${planTier.toUpperCase()} activo.`, 'info');
      return;
    }

    // ============================================================================
    // TEMPORARY DEMO MODE: Open Checkout Modal with instant auto-activation
    // ============================================================================
    if (DEMO_AUTO_ACTIVATE_MODE) {
      setCheckoutPlan(planTier);
      return;
    }

    setLoadingPlan(planTier);
    setConfigError(null);

    try {
      const checkout = await api.createSubscriptionCheckout(planTier, billingCycle);

      if (checkout.redirectUrl) {
        onTriggerToast('Redirigiendo a la pasarela segura de Flow.cl...', 'info');
        // Open Flow payment gateway
        window.location.href = checkout.redirectUrl;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      if (err.data?.code === 'FLOW_NOT_CONFIGURED') {
        setConfigError(
          'La pasarela de pago Flow.cl aún no está configurada con llaves de API en las variables de entorno de Vercel (FLOW_API_KEY y FLOW_SECRET_KEY).'
        );
      } else {
        onTriggerToast(err.message || 'Error al conectar con la pasarela de pago.', 'error');
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const res = await api.cancelSubscription();
      await onRefreshSubscription();
      setShowCancelConfirm(false);
      onTriggerToast(res.message || 'Suscripción cancelada.', 'success');
    } catch (err: any) {
      onTriggerToast(err.message || 'Error al cancelar la suscripción.', 'error');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div id="plans-view-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header & Title */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 bg-blue-950/50 border border-blue-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-cyan-400 mb-4">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Planes diseñados para viajeros inteligentes</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-display tracking-tight">
          Elige el plan ideal para tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">próximas aventuras</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
          Controla presupuestos, divide gastos con amigos sin enredos y viaja con total tranquilidad financiera.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-8 inline-flex items-center bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl shadow-xl">
          <button
            id="billing-monthly-btn"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Facturación Mensual
          </button>
          <button
            id="billing-annual-btn"
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 ${
              billingCycle === 'annual'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Facturación Anual</span>
            <span className="bg-cyan-400/20 text-cyan-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-cyan-400/30">
              Ahorra ~16%
            </span>
          </button>
        </div>
      </div>

      {/* Configuration notice if Flow is not configured in Vercel */}
      {configError && (
        <div className="mb-8 max-w-3xl mx-auto bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-6 text-amber-200 text-xs sm:text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="font-bold text-white">Configuración de Pasarela de Pago (Flow.cl)</p>
            <p>{configError}</p>
            <p className="text-amber-300/80 text-xs">
              Para habilitar cobros en vivo o sandbox en producción, agrega <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">FLOW_API_KEY</code> y <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">FLOW_SECRET_KEY</code> en las Variables de Entorno del proyecto en Vercel.
            </p>
          </div>
        </div>
      )}

      {/* Current Subscription Status Bar if paid */}
      {subscription && subscription.plan !== 'free' && (
        <div className={`mb-8 max-w-4xl mx-auto rounded-3xl p-5 sm:p-6 transition-all ${
          subscription.status === 'canceled'
            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-[#070b16] border border-amber-500/40 shadow-xl shadow-amber-500/5'
            : 'bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-[#070b16] border border-cyan-500/40 shadow-xl shadow-cyan-500/5'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                subscription.plan === 'premium'
                  ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400'
                  : 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-400'
              }`}>
                {subscription.plan === 'premium' ? <Crown className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black text-white uppercase tracking-wide">
                    Plan Actual: {subscription.plan.toUpperCase()}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    subscription.status === 'active'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {subscription.status === 'active' ? '● Suscripción Activa' : '● Cancelada (En período de gracia)'}
                  </span>
                </div>

                {subscription.status === 'canceled' ? (
                  <p className="text-xs text-amber-200 mt-1 font-medium leading-relaxed">
                    {subscription.currentPeriodEnd ? (
                      <>
                        Tu plan <b>{subscription.plan.toUpperCase()}</b> sigue activo hasta el{' '}
                        <b>
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </b>
                        , después pasarás a Gratis automáticamente.
                      </>
                    ) : (
                      <>Tu plan ha sido cancelado. Tu cuenta pasará al plan Gratis automáticamente.</>
                    )}
                  </p>
                ) : (
                  subscription.currentPeriodEnd && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Próxima renovación:{' '}
                        <b className="text-slate-300">
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </b>
                      </span>
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Cancel Plan Button - only shown if paid plan is active */}
            {subscription.status === 'active' && (
              <button
                id="cancel-plan-btn"
                onClick={() => setShowCancelConfirm(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar plan</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.popular;
          const isPremiumTier = plan.id === 'premium';
          const isProTier = plan.id === 'pro';

          const displayPrice = billingCycle === 'annual' ? plan.priceAnnualFormatted : plan.priceMonthlyFormatted;
          const pricePeriod = plan.id === 'free' ? 'gratis para siempre' : billingCycle === 'annual' ? '/año' : '/mes';

          return (
            <div
              key={plan.id}
              id={`plan-card-${plan.id}`}
              className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                isPopular
                  ? 'bg-gradient-to-b from-blue-950/40 via-slate-900/90 to-[#070b16] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10'
                  : isPremiumTier
                  ? 'bg-gradient-to-b from-purple-950/30 via-slate-900/90 to-[#070b16] border border-purple-500/30 shadow-xl shadow-purple-500/5'
                  : 'bg-slate-900/40 border border-white/10 hover:border-white/20 shadow-lg'
              }`}
            >
              {/* Badge for Popular or Premium */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-extrabold text-[10px] uppercase tracking-wider py-1 px-3.5 rounded-full shadow-md">
                  Más Popular
                </div>
              )}
              {isPremiumTier && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-purple-500 text-white font-extrabold text-[10px] uppercase tracking-wider py-1 px-3.5 rounded-full shadow-md flex items-center space-x-1">
                  <Crown className="w-3 h-3 text-amber-200" />
                  <span>Completo</span>
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-white font-display">{plan.name}</h3>
                  {plan.id === 'free' && <span className="text-xs text-slate-400 font-medium">Básico</span>}
                  {isProTier && <Zap className="w-5 h-5 text-cyan-400" />}
                  {isPremiumTier && <Crown className="w-5 h-5 text-amber-400" />}
                </div>

                <p className="text-xs text-slate-400 min-h-[36px] leading-relaxed mb-6">{plan.description}</p>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-white/5">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{displayPrice}</span>
                    <span className="text-xs text-slate-400 font-medium">{pricePeriod}</span>
                  </div>
                  {billingCycle === 'annual' && plan.id !== 'free' && (
                    <p className="text-[11px] text-cyan-400 mt-1 font-medium">
                      Equivale a ~${plan.id === 'pro' ? '2.499' : '4.999'} CLP al mes
                    </p>
                  )}
                </div>

                {/* Feature List */}
                <div className="space-y-3 mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incluye:</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start space-x-2.5 text-xs">
                        {feat.included ? (
                          <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            isPremiumTier ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-600">
                            <span className="text-[10px]">✕</span>
                          </div>
                        )}
                        <span className={feat.included ? 'text-slate-200' : 'text-slate-500 line-through'}>
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full bg-slate-800 border border-slate-700 text-slate-400 font-bold py-3 px-4 rounded-2xl text-xs cursor-default flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Tu Plan Actual</span>
                  </button>
                ) : (
                  <button
                    id={`select-plan-${plan.id}`}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
                      isPopular
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25'
                        : isPremiumTier
                        ? 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Conectando con Flow...</span>
                      </>
                    ) : (
                      <>
                        <span>{plan.ctaLabel}</span>
                        {plan.id !== 'free' && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                )}

                {/* Recurring subscription compliance note */}
                {plan.id !== 'free' && !isCurrent && (
                  <p className="text-[10.5px] text-slate-400 text-center mt-2.5 leading-relaxed px-1">
                    Renovación automática {billingCycle === 'annual' ? 'anual' : 'mensual'}. Puedes{' '}
                    <button
                      type="button"
                      onClick={handleCancelPlanLinkClick}
                      className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 font-semibold transition cursor-pointer"
                    >
                      cancelarla
                    </button>{' '}
                    en cualquier momento desde tu perfil, sin cargos adicionales.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison FAQ / Flow Trust Footer */}
      <div className="mt-16 max-w-4xl mx-auto border-t border-white/10 pt-10">
        <div className="text-center mb-8">
          <h4 className="text-lg font-bold text-white font-display">Preguntas Frecuentes sobre la Facturación</h4>
          <p className="text-xs text-slate-400 mt-1">Transparencia total sin letras chicas ni cobros ocultos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <h5 className="font-bold text-white text-xs flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>¿Qué medios de pago acepta Flow.cl?</span>
            </h5>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Flow.cl procesa pagos directos con Webpay Plus (Débito y Crédito), tarjetas bancarias chilenas e internacionales, Mach, Servipag y transferencias electrónicas seguras.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <h5 className="font-bold text-white text-xs flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>¿Puedo cancelar en cualquier momento?</span>
            </h5>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Sí, puedes cancelar tu suscripción con un solo clic en esta misma pantalla. Mantendrás todos los beneficios activos hasta el último día de tu período ya pagado.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <h5 className="font-bold text-white text-xs flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>¿Qué pasa con mis datos si vuelvo al plan Gratis?</span>
            </h5>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Tus viajes, gastos e historial nunca se borran. Seguirás teniendo acceso a tu viaje activo y a tus registros históricos intactos en PostgreSQL.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <h5 className="font-bold text-white text-xs flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>¿Ofrecen boleta o factura?</span>
            </h5>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              El comprobante oficial de pago electrónico emitido por Flow.cl llega inmediatamente a tu correo electrónico al completarse la transacción.
            </p>
          </div>
        </div>

        {/* Security badge & Legal links */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Pagos protegidos por encriptación TLS y pasarela segura Flow.cl</span>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('terms')}
              className="hover:text-cyan-300 underline underline-offset-2 transition cursor-pointer"
            >
              Términos de Suscripción
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('privacy')}
              className="hover:text-cyan-300 underline underline-offset-2 transition cursor-pointer"
            >
              Privacidad
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('contact')}
              className="hover:text-cyan-300 underline underline-offset-2 transition cursor-pointer"
            >
              Contacto
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
              ¿Seguro que quieres cancelar tu plan {subscription?.plan.toUpperCase()}?
            </h3>
            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
              {subscription?.currentPeriodEnd ? (
                <>
                  Mantendrás tu plan{' '}
                  <b className="text-white">{subscription.plan.toUpperCase()}</b> activo hasta el{' '}
                  <b className="text-cyan-300">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </b>
                  . Después pasarás al plan Gratis automáticamente sin cobros adicionales.
                </>
              ) : (
                <>
                  Tu cuenta pasará al plan Gratis de inmediato. Mantendrás todos tus viajes y datos históricos intactos.
                </>
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
                id="confirm-cancel-plan-btn"
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

      {/* Checkout Modal (Demo Mode Auto-Activation) */}
      {checkoutPlan && (
        <CheckoutModal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          currentUser={currentUser}
          plan={checkoutPlan}
          billingCycle={billingCycle}
          onSuccess={async (newSub) => {
            await onRefreshSubscription();
          }}
          onShowToast={onTriggerToast}
          onCancelPlanClick={handleCancelPlanLinkClick}
        />
      )}
    </div>
  );
};
