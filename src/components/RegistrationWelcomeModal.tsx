import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Compass, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  DollarSign, 
  WifiOff, 
  CheckCircle2 
} from 'lucide-react';
import { User } from '../types';
import { RumbioLogo } from './RumbioLogo';

interface RegistrationWelcomeModalProps {
  user: User;
  onContinue: () => void;
}

export const RegistrationWelcomeModal: React.FC<RegistrationWelcomeModalProps> = ({
  user,
  onContinue,
}) => {
  useEffect(() => {
    // Launch celebratory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#3b82f6', '#10b981', '#fbbf24'],
      });
    } catch {
      // Ignore if canvas-confetti is not available
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#070b16] border border-cyan-500/30 rounded-[32px] p-6 sm:p-8 shadow-2xl relative text-slate-200 overflow-hidden space-y-6">
        
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header with Icon */}
        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 shadow-xl shadow-cyan-500/10 mb-1">
            <RumbioLogo concept="growth-compass" variant="icon" size={48} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cuenta Verificada con Éxito</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            ¡Gracias por unirte, {user.name.split(' ')[0]}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Tu cuenta está 100% activa y protegida. Estás listo para tener el control total de tus gastos y presupuesto de viaje.
          </p>
        </div>

        {/* 3 Quick Startup Steps */}
        <div className="space-y-3 relative z-10">
          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 text-center">
            3 Pasos para comenzar tu aventura
          </h4>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Step 1 */}
            <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center space-x-3.5 hover:border-cyan-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold text-xs">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Crea tu primer viaje</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Define tu destino, fechas y presupuesto estimado total.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center space-x-3.5 hover:border-cyan-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs">
                2
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Configura tus divisas y tasas</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Elige tus monedas locales con conversión automática en tiempo real.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center space-x-3.5 hover:border-cyan-500/30 transition">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 font-bold text-xs">
                3
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5 text-purple-400" />
                  <span>Registra gastos incluso sin internet</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  La app guarda tus gastos en modo offline y los sincroniza al volver la red.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-2 relative z-10 space-y-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
          >
            <span>Ir a mi Dashboard de Viajes</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Datos Cifrados
            </span>
            <span>•</span>
            <span>Plan Gratuito Activo</span>
          </div>
        </div>

      </div>
    </div>
  );
};
