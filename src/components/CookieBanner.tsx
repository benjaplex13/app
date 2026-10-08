import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { LegalTab } from './LegalModal';

interface CookieBannerProps {
  onOpenLegal: (tab: LegalTab) => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenLegal }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('rumbio_cookie_consent');
      if (!consent) {
        // Show after a brief delay for smooth appearance
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('rumbio_cookie_consent', 'accepted_' + new Date().toISOString());
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de privacidad y almacenamiento"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-40 animate-slideUp"
    >
      <div className="bg-[#070b16]/95 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl text-slate-200 space-y-3 relative">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div className="space-y-1 pr-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
              Almacenamiento Local & Privacidad
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Usamos únicamente almacenamiento técnico esencial (sesión segura y soporte offline PWA).{' '}
              <b className="text-white">Sin cookies de terceros ni rastreadores publicitarios.</b>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 gap-2 border-t border-white/5">
          <button
            onClick={() => onOpenLegal('cookies')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
          >
            Más detalles
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAccept}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer active:scale-95 flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
