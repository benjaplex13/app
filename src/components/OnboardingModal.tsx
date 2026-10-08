import React, { useState } from 'react';
import { 
  Compass, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Plane, 
  Receipt, 
  PieChart, 
  Users, 
  Sparkles, 
  Gift 
} from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Bienvenido a Rumbio',
      subtitle: 'Tu compañero financiero definitivo para viajar por el mundo',
      icon: Compass,
      color: 'from-sky-600 to-blue-600',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <p className="leading-relaxed">
            <b>Rumbio</b> está diseñado para eliminar el estrés financiero en tus viajes. Administra gastos en cualquier moneda extranjera, supervisa tus presupuestos con alertas inteligentes y divide gastos grupales sin discusiones.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="font-bold text-white block mb-1">🌍 Multidivisa en Vivo</span>
              <span className="text-[11px] text-slate-400">Conversión automática instantánea a tu moneda base.</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="font-bold text-white block mb-1">🤝 Split Grupal Óptimo</span>
              <span className="text-[11px] text-slate-400">Simplificación matemática de deudas entre viajeros.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '1. Autenticación y Privacidad Total',
      subtitle: 'Cuentas 100% privadas y seguras con código OTP',
      icon: ShieldCheck,
      color: 'from-emerald-600 to-teal-600',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <p className="leading-relaxed">
            Cada usuario tiene su propio espacio totalmente aislado. Al registrarte o pedir recuperación, recibirás un <b>código seguro de 6 dígitos</b> que puedes ver en el <b>Simulador de Correo</b> flotante (abajo a la derecha).
          </p>
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>Tus datos financieros jamás son compartidos ni visibles para otros usuarios.</span>
          </div>
        </div>
      ),
    },
    {
      title: '2. Crear y Configurar un Viaje',
      subtitle: 'Destino, fechas, presupuesto y tasa de cambio',
      icon: Plane,
      color: 'from-sky-600 to-cyan-600',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <p className="leading-relaxed">
            Presiona <b>+ Nuevo Viaje</b> en la barra superior. Ingresa el destino (por ejemplo, Tokio o Roma), las fechas del viaje, tu presupuesto asignado y la moneda local del país.
          </p>
          <p className="leading-relaxed text-slate-400 text-xs">
            Rumbio calculará automáticamente una tasa aproximada, la cual puedes ajustar cuando quieras según el tipo de cambio que te cobre tu banco o casa de cambio.
          </p>
        </div>
      ),
    },
    {
      title: '3. Registrar Gastos & Categorías',
      subtitle: 'Añade consumos en moneda extranjera al instante',
      icon: Receipt,
      color: 'from-amber-600 to-orange-600',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <p className="leading-relaxed">
            Con el botón <b>+ Registrar Gasto</b>, añade alojamientos, comidas, transportes, tours o compras. Elige la moneda en la que pagaste (ej. Yenes o Euros) y verás la conversión inmediata en tu moneda base.
          </p>
          <p className="leading-relaxed text-slate-400 text-xs">
            También puedes asignar quién realizó el desembolso y qué miembros del grupo comparten el consumo.
          </p>
        </div>
      ),
    },
    {
      title: '4. Presupuesto, Alertas & Split Grupal',
      subtitle: 'Control visual de límites y liquidación de deudas',
      icon: Users,
      color: 'from-indigo-600 to-purple-600',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <p className="leading-relaxed">
            En <b>Presupuesto & Alertas</b>, las barras de progreso cambiarán a ámbar al 80% y a rojo si superas el 100% de cualquier categoría.
          </p>
          <p className="leading-relaxed">
            En la pestaña <b>Dividir Cuentas (Split)</b>, el algoritmo simplifica todos los pagos cruzados en las transferencias mínimas necesarias: sabrás con exactitud <i>quién le debe a quién</i> en un solo clic.
          </p>
        </div>
      ),
    },
    {
      title: '5. Secretos y Easter Eggs 🎁',
      subtitle: '¡Hay sorpresas ocultas en la aplicación!',
      icon: Gift,
      color: 'from-pink-600 to-rose-600',
      content: (
        <div className="space-y-2.5 text-xs sm:text-sm text-slate-300">
          <p className="leading-relaxed">
            Rumbio incluye 3 secretos interactivos diseñados para viajeros curiosos:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 pl-1">
            <li><b>Brújula de Fiesta:</b> Haz 5 clics seguidos en el logo de la brújula.</li>
            <li><b>Billete Dorado:</b> Registra un gasto con el nombre <i>Billete Dorado</i>.</li>
            <li><b>Viajero Galáctico:</b> Busca <i>viajero galactico</i> en la barra de búsqueda de gastos.</li>
          </ul>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-glow w-full max-w-xl rounded-3xl p-6 sm:p-8 border border-sky-500/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${current.color} flex items-center justify-center text-white shadow-lg`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">{current.title}</h3>
              <p className="text-xs text-sky-400">{current.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="py-3 flex-1 min-h-[220px]">
          {current.content}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
          {/* Step indicators */}
          <div className="flex space-x-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentStep === idx ? 'w-7 bg-sky-400' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Paso ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-sky-600/20 transition"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-sky-600/20 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>¡Comenzar mi Viaje!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
