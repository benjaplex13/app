import React, { useState } from 'react';
import { Plane, X, Calendar, DollarSign, Users, Sparkles, ArrowRightLeft, Trash2, Home, MapPin } from 'lucide-react';
import { Trip, CurrencyCode, User } from '../types';
import { CURRENCIES, CURRENCIES_BY_REGION } from '../data/currencies';

interface TripModalProps {
  trip?: Trip | null;
  currentUser: User;
  onSave: (tripData: Partial<Trip>) => void;
  onDelete?: (tripId: string) => void;
  onClose: () => void;
}

export const TripModal: React.FC<TripModalProps> = ({
  trip,
  currentUser,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState(trip?.name || '');
  const [destination, setDestination] = useState(trip?.destination || '');
  const [startDate, setStartDate] = useState(trip?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(trip?.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [budget, setBudget] = useState(trip ? trip.budget.toString() : '2000');
  const [homeCurrency, setHomeCurrency] = useState<CurrencyCode>((currentUser.homeCurrency as CurrencyCode) || 'USD');
  const [currency, setCurrency] = useState<CurrencyCode>(trip?.currency || 'EUR');
  const [exchangeRate, setExchangeRate] = useState(trip ? trip.exchangeRate.toString() : '1.08');
  const [membersInput, setMembersInput] = useState(trip ? trip.members.join(', ') : 'Yo, Carlos, Valeria');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Recalculate exchange rate when either currency changes
  const recalcRate = (destCurr: CurrencyCode, homeCurr: CurrencyCode) => {
    const destRateToUSD = CURRENCIES[destCurr]?.approxRateToUSD || 1;
    const homeRateToUSD = CURRENCIES[homeCurr]?.approxRateToUSD || 1;
    const computedRate = Math.round((destRateToUSD / homeRateToUSD) * 10000) / 10000;
    setExchangeRate(computedRate.toString());
  };

  const handleDestCurrencyChange = (newCurr: CurrencyCode) => {
    setCurrency(newCurr);
    recalcRate(newCurr, homeCurrency);
  };

  const handleHomeCurrencyChange = (newCurr: CurrencyCode) => {
    setHomeCurrency(newCurr);
    recalcRate(currency, newCurr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destination.trim()) return;

    const parsedBudget = parseFloat(budget) || 1000;
    const parsedRate = parseFloat(exchangeRate) || 1.0;
    const members = membersInput
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    if (!members.includes('Yo')) {
      members.unshift('Yo');
    }

    onSave({
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      budget: parsedBudget,
      currency,
      exchangeRate: parsedRate,
      members,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101e] w-full max-w-lg rounded-[32px] p-6 sm:p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-white/5">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">
                {trip ? 'Editar Configuración del Viaje' : 'Crear Nuevo Viaje'}
              </h3>
              <p className="text-xs text-slate-400">Define destino, presupuesto y tipo de cambio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Trip Name */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-widest text-[11px]">
              Nombre del Viaje
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ruta por la Costa Amalfitana"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-widest text-[11px]">
              Destino / Ciudades
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ej: Nápoles, Positano & Capri"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Fecha Inicio
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Fecha Fin
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Presupuesto Total
            </label>
            <input
              type="number"
              step="any"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="2500"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Home & Destination Currencies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-400" /> Moneda de Tu País
              </label>
              <select
                value={homeCurrency}
                onChange={(e) => handleHomeCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-3 text-white focus:border-emerald-500 focus:outline-none"
              >
                {CURRENCIES_BY_REGION.map((group) => (
                  <optgroup key={group.region} label={group.region} className="bg-slate-900 text-slate-300 font-semibold">
                    {group.currencies.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                        {c.flag} {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Moneda del Destino
              </label>
              <select
                value={currency}
                onChange={(e) => handleDestCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full bg-slate-900/80 border border-blue-500/20 rounded-2xl p-3 text-white focus:border-blue-500 focus:outline-none"
              >
                {CURRENCIES_BY_REGION.map((group) => (
                  <optgroup key={group.region} label={group.region} className="bg-slate-900 text-slate-300 font-semibold">
                    {group.currencies.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                        {c.flag} {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                Tasa de Conversión (1 {currency} = ? {homeCurrency})
              </label>
              <span className="text-[10px] text-cyan-400">Actualizable en vivo</span>
            </div>
            <input
              type="number"
              step="0.000001"
              required
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">
              Todos los gastos en {currency} se convertirán automáticamente a {homeCurrency}.
            </p>
          </div>

          {/* Travel Companions / Split Members */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 text-[11px] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Integrantes del Viaje (separados por coma)
            </label>
            <input
              type="text"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              placeholder="Yo, Carlos, Valeria, Andrea"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Úsalos luego en la pestaña de <b>Dividir Cuentas</b> para saber quién le debe a quién.
            </p>
          </div>

          {/* Actions: Save & Optional Delete */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 text-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{trip ? 'Guardar Cambios' : 'Lanzar Viaje'}</span>
            </button>

            {trip && onDelete && (
              <div>
                {!showConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-2.5 text-xs text-rose-400 hover:text-rose-300 flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar este viaje</span>
                  </button>
                ) : (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-rose-300 font-semibold">¿Seguro que deseas eliminar el viaje?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-3 py-1 bg-slate-800 text-xs text-slate-300 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(trip.id)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white rounded-lg"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
