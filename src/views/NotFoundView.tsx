import React from 'react';
import { Compass, Home, ArrowLeft, ShieldCheck } from 'lucide-react';
import { RumbioLogo } from '../components/RumbioLogo';

interface NotFoundViewProps {
  onGoHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl rounded-[32px] p-8 sm:p-12 shadow-2xl border border-white/10 text-center relative z-10 space-y-6">
        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl shadow-blue-600/20">
          <Compass className="w-12 h-12 text-cyan-400 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-widest">
            Error 404 • Fuera de Mapa
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-display tracking-tight">
            404
          </h1>
          <h2 className="text-lg font-bold text-slate-200">
            Ruta no encontrada
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Parece que te has desviado del itinerario. La sección que intentas visitar no existe o fue reubicada.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Volver a Mis Viajes</span>
          </button>
        </div>

        <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
          <span>Rumbio • Finanzas de Viaje Inteligentes</span>
        </div>
      </div>
    </div>
  );
};
