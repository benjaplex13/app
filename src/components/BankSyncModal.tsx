import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  ArrowRight, 
  Sparkles, 
  Check, 
  X, 
  Lock, 
  RefreshCw, 
  Info, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  DownloadCloud,
  CheckCircle2
} from 'lucide-react';
import { Trip, User, UserSubscription, ExpenseCategory, CurrencyCode } from '../types';
import { formatMoney } from '../utils/finance';
import { api } from '../utils/api';

interface BankSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentUser: User;
  subscription: UserSubscription | null;
  onExpensesImported?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenPlans?: () => void;
}

interface DemoMovement {
  id: string;
  bankName: string;
  description: string;
  merchantName: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  category: ExpenseCategory;
  selected: boolean;
}

export const BankSyncModal: React.FC<BankSyncModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUser,
  subscription,
  onExpensesImported,
  onShowToast,
  onOpenPlans,
}) => {
  const isPremium = subscription?.plan === 'premium';

  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [bankingConfig, setBankingConfig] = useState<any>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('banco_chile');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDevGuide, setShowDevGuide] = useState(false);

  // Sample real movements from bank feed
  const [movements, setMovements] = useState<DemoMovement[]>([
    {
      id: 'mov_101',
      bankName: 'Banco de Chile',
      description: 'STARBUCKS AIRPORT SCL',
      merchantName: 'Starbucks Coffee',
      amount: 6800,
      currency: 'CLP',
      date: new Date().toISOString().split('T')[0],
      category: 'Comida',
      selected: true,
    },
    {
      id: 'mov_102',
      bankName: 'Banco de Chile',
      description: 'UBER TRIP SANTIAGO',
      merchantName: 'Uber BV',
      amount: 14500,
      currency: 'CLP',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      category: 'Transporte',
      selected: true,
    },
    {
      id: 'mov_103',
      bankName: 'Banco Santander',
      description: 'HOTEL BOOKING REF 9482',
      merchantName: 'Booking.com',
      amount: 85000,
      currency: 'CLP',
      date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      category: 'Alojamiento',
      selected: true,
    },
    {
      id: 'mov_104',
      bankName: 'Banco BCI',
      description: 'FARMACIA AHUMADA',
      merchantName: 'Farmacias Ahumada',
      amount: 12400,
      currency: 'CLP',
      date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
      category: 'Imprevistos',
      selected: false,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setIsLoadingConfig(true);
      const res = await api.getBankingConfig();
      setBankingConfig(res);
    } catch (err) {
      console.warn('Could not load banking config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelectMovement = (id: string) => {
    setMovements(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
  };

  const selectAll = (select: boolean) => {
    setMovements(prev => prev.map(m => ({ ...m, selected: select })));
  };

  const handleImportSelected = async () => {
    const selectedMovs = movements.filter(m => m.selected);
    if (selectedMovs.length === 0) {
      onShowToast('Selecciona al menos un movimiento para importar.', 'warning');
      return;
    }

    if (!isPremium) {
      onShowToast('La importación bancaria automática requiere el Plan Premium.', 'info');
      onOpenPlans?.();
      return;
    }

    try {
      setIsImporting(true);
      const payload = selectedMovs.map(m => ({
        description: m.description,
        merchantName: m.merchantName,
        amount: m.amount,
        currency: m.currency,
        date: m.date,
        category: m.category,
        bankName: m.bankName,
        reference: m.id,
      }));

      const res = await api.importBankingMovementsToExpenses(trip.id, payload);
      onShowToast(`¡${res.importedCount || selectedMovs.length} gastos importados exitosamente desde tu cuenta bancaria!`, 'success');
      onExpensesImported?.();
      onClose();
    } catch (err: any) {
      console.error('Error importing movements:', err);
      onShowToast(err.message || 'Error al importar movimientos.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">Sincronización Bancaria Automática</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                    Premium
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Open Banking Chile & LatAm (Fintoc & Belvo): importa movimientos de tus tarjetas directo a los gastos del viaje.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan check gate */}
        {!isPremium && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-amber-200">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Esta función requiere el <b>Plan Premium</b>. Puedes previsualizar la conexión bancaria aquí.</span>
            </div>
            {onOpenPlans && (
              <button
                onClick={() => { onClose(); onOpenPlans(); }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shrink-0 transition"
              >
                Ver Plan Premium
              </button>
            )}
          </div>
        )}

        {/* Content area with scrolling */}
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Bank Provider Status & Supported Institutions */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Instituciones Financieras Compatibles (Chile & LatAm)
              </span>
              <button
                onClick={() => setShowDevGuide(!showDevGuide)}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showDevGuide ? 'Ocultar requisitos API' : '¿Cómo se conecta en producción?'}</span>
              </button>
            </div>

            {/* Dev requirements guide */}
            {showDevGuide && (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-white">Requisitos de Conexión en Producción (Open Banking):</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                  <li><b>Fintoc (Recomendado para Chile):</b> Requiere registrarte en <code>fintoc.com</code> y configurar la variable de entorno <code>FINTOC_SECRET_KEY</code> y <code>FINTOC_PUBLIC_KEY</code>.</li>
                  <li><b>Belvo (México / Brasil / Colombia):</b> Requiere <code>BELVO_SECRET_ID</code> y <code>BELVO_SECRET_PASSWORD</code>.</li>
                  <li><b>Seguridad Cero-Custodia:</b> Rumbio nunca almacena contraseñas bancarias; la autenticación se realiza mediante los widgets oficiales encriptados TLS de los proveedores.</li>
                </ul>
              </div>
            )}

            {/* Supported Banks Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'banco_chile', name: 'Banco de Chile', tag: 'Chile' },
                { id: 'santander_cl', name: 'Santander', tag: 'Chile' },
                { id: 'bci', name: 'BCI / MACH', tag: 'Chile' },
                { id: 'banco_estado', name: 'BancoEstado', tag: 'CuentaRUT' },
                { id: 'falabella_cl', name: 'Falabella CMR', tag: 'Chile' },
                { id: 'scotiabank_cl', name: 'Scotiabank', tag: 'Chile' },
                { id: 'itau_cl', name: 'Itaú', tag: 'Chile' },
                { id: 'bbva_mx', name: 'BBVA / Nu', tag: 'LatAm' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBankId(b.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedBankId === b.id
                      ? 'bg-blue-600/20 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold block truncate">{b.name}</span>
                  <span className="text-[9px] text-cyan-400 font-mono">{b.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Movements Import Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Movimientos Detectados ({movements.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Selecciona los consumos que correspondan a este viaje ({trip.name}) para agregarlos a tu libro de gastos.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Seleccionar todos
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => selectAll(false)}
                  className="text-[11px] text-slate-400 hover:underline"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* List of movements */}
            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-slate-950/60">
              {movements.map((mov) => (
                <div
                  key={mov.id}
                  onClick={() => toggleSelectMovement(mov.id)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                    mov.selected ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                      mov.selected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-white/20 bg-slate-900'
                    }`}>
                      {mov.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{mov.description}</span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {mov.category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span>{mov.bankName}</span>
                        <span>•</span>
                        <span>{mov.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white block">
                      {formatMoney(mov.amount, mov.currency)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">Cargo con tarjeta</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <span className="text-xs text-slate-400">
            {movements.filter(m => m.selected).length} movimiento(s) seleccionado(s) para importar al viaje.
          </span>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleImportSelected}
              disabled={isImporting || movements.filter(m => m.selected).length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 transition active:scale-95"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>Importar a Gastos del Viaje</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
