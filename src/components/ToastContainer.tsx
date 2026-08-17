import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification } from '../types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const iconConfig = {
          success: { icon: CheckCircle2, bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' },
          error: { icon: AlertCircle, bg: 'bg-rose-950/90 border-rose-500/40 text-rose-200' },
          warning: { icon: AlertTriangle, bg: 'bg-amber-950/90 border-amber-500/40 text-amber-200' },
          info: { icon: Info, bg: 'bg-sky-950/90 border-sky-500/40 text-sky-200' },
        }[toast.type];

        const Icon = iconConfig.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-x-0 ${iconConfig.bg}`}
          >
            <div className="flex items-start space-x-2.5">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg ml-2 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
