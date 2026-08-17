import React, { useState } from 'react';
import { Plus, HelpCircle, LogOut, Plane, Sparkles, Palette } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, Trip } from '../types';
import { RumbioLogo, LogoConcept } from './RumbioLogo';

interface NavbarProps {
  currentUser: User;
  trips: Trip[];
  activeTripId: string | null;
  currentConcept?: LogoConcept;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTripModal: () => void;
  onOpenBrandModal?: () => void;
  onOpenGuide: () => void;
  onLogout: () => void;
  onTriggerSecret: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  trips,
  activeTripId,
  currentConcept = 'growth-compass',
  onSelectTrip,
  onOpenNewTripModal,
  onOpenBrandModal,
  onOpenGuide,
  onLogout,
  onTriggerSecret,
}) => {
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);

    if (nextCount >= 5) {
      setLogoClicks(0);
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#0ea5e9', '#38bdf8', '#0284c7', '#38ef7d', '#ffffff']
      });
      onTriggerSecret('🎉 ¡Modo Fiesta de Viajeros Desbloqueado! Has descubierto el Secreto de la Brújula.');
    }
  };

  return (
    <header className="bg-[#050811] border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo with 5-click Easter Egg and direct brand switcher */}
        <div className="flex items-center space-x-3.5">
          <div
            id="app-brand-logo"
            onClick={handleLogoClick}
            className="cursor-pointer select-none transform hover:scale-105 active:scale-95 transition-all group p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/40 shadow-lg shadow-blue-500/10 flex items-center"
            title="Rumbio - Clic 5 veces para una sorpresa"
          >
            <RumbioLogo concept={currentConcept} variant="icon" size={32} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold tracking-tight text-white font-display">
                Rumbio<span className="text-cyan-400">.</span>
              </span>
              {onOpenBrandModal && (
                <button
                  onClick={onOpenBrandModal}
                  className="hidden sm:flex items-center gap-1.5 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 transition active:scale-95"
                  title="Ver y descargar variantes de Logo"
                >
                  <Palette className="w-3 h-3 text-cyan-400" />
                  <span>Ver Logo & Identidad</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trip Switcher & Quick New Trip */}
        <div className="flex items-center space-x-2.5">
          {trips.length > 0 ? (
            <div className="relative">
              <select
                id="trip-selector"
                value={activeTripId || ''}
                onChange={(e) => onSelectTrip(e.target.value)}
                aria-label="Seleccionar viaje activo"
                className="bg-slate-900/60 border border-white/10 text-white text-xs sm:text-sm rounded-2xl py-2 pl-3 pr-8 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer appearance-none max-w-[180px] sm:max-w-[240px] truncate"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-950 text-white">
                    ✈️ {t.name} ({t.destination})
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plane className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : null}

          <button
            id="new-trip-navbar-btn"
            onClick={onOpenNewTripModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-600/20 border border-blue-400/20 flex items-center space-x-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Viaje</span>
          </button>
        </div>

        {/* Right Menu: Guide, User info & Logout */}
        <div className="flex items-center space-x-3">
          {onOpenBrandModal && (
            <button
              onClick={onOpenBrandModal}
              className="sm:hidden flex items-center text-cyan-400 p-2 rounded-xl hover:bg-white/5 transition"
              title="Logo & Marca"
            >
              <Palette className="w-4 h-4" />
            </button>
          )}

          <button
            id="guide-btn"
            onClick={onOpenGuide}
            className="flex items-center space-x-1 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition text-xs"
            title="¿Cómo usar Rumbio?"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline font-medium">Guía</span>
          </button>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3 border-l border-slate-800 pl-4 sm:pl-6">
            <div className="hidden md:block text-right">
              <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-[130px]">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Base: {currentUser.homeCurrency}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'SV'}
            </div>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-white/5 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
