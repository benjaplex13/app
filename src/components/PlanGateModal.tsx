import React from 'react';
import { Sparkles, Check, ArrowRight, X, ShieldCheck, Zap, Crown } from 'lucide-react';
import { PlanTier } from '../types';
import { PLANS } from '../data/plans';

interface PlanGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: PlanTier) => void;
  featureTitle?: string;
  featureDescription?: string;
  requiredPlan?: PlanTier;
}

export const PlanGateModal: React.FC<PlanGateModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  featureTitle = 'Función Exclusiva para Planes Pro y Premium',
  featureDescription = 'Desbloquea viajes ilimitados, división grupal de gastos y herramientas avanzadas de finanzas para tus viajes.',
  requiredPlan = 'pro',
}) => {
  if (!isOpen) return null;

  const targetPlan = PLANS.find((p) => p.id === requiredPlan) || PLANS[1]; // Pro default

  return (
    <div
      id="plan-gate-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="plan-gate-modal-card"
        className="relative w-full max-w-lg bg-[#070b16] border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-500/10 text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#070b16] rounded-[14px] flex items-center justify-center">
              {requiredPlan === 'premium' ? (
                <Crown className="w-6 h-6 text-amber-400" />
              ) : (
                <Sparkles className="w-6 h-6 text-cyan-400" />
              )}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              Plan {requiredPlan.toUpperCase()} Requerido
            </span>
            <h3 className="text-xl font-bold font-display text-white mt-1">{featureTitle}</h3>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">{featureDescription}</p>

        {/* Plan Spotlight Card */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-base">{targetPlan.name}</p>
              <p className="text-xs text-slate-400">{targetPlan.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-cyan-300">{targetPlan.priceMonthlyFormatted}</span>
              <span className="text-xs text-slate-400"> /mes</span>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          <ul className="space-y-2 text-xs text-slate-300">
            {targetPlan.features.slice(0, 4).map((feat, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{feat.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            id="plan-gate-upgrade-btn"
            onClick={() => {
              onClose();
              onSelectPlan(requiredPlan);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
          >
            <span>Ver y Activar Plan {targetPlan.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="plan-gate-cancel-btn"
            onClick={onClose}
            className="w-full text-xs text-slate-400 hover:text-white py-2 transition"
          >
            Continuar con mi plan actual
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pagos 100% seguros procesados con Flow.cl (Webpay / Tarjetas)</span>
        </div>
      </div>
    </div>
  );
};
