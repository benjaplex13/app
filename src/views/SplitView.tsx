import React, { useState } from 'react';
import { 
  Users, 
  ArrowRight, 
  Copy, 
  Check, 
  Wallet, 
  ArrowLeftRight, 
  UserPlus,
  Trash2,
  PlusCircle,
  Receipt,
  Sparkles,
  Info
} from 'lucide-react';
import { Trip, Expense, User } from '../types';
import { calculateSplitDebts, formatMoney, convertToHomeCurrency } from '../utils/finance';

interface SplitViewProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  onUpdateTripMembers: (newMembers: string[]) => void;
  onOpenExpenseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  trip,
  expenses,
  currentUser,
  onUpdateTripMembers,
  onOpenExpenseModal,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const { settlements, balances, totalSpent } = calculateSplitDebts(expenses, trip, currentUser.homeCurrency);

  // Calculate detailed stats per member: Total Paid vs Total Consumed (Owed)
  const memberStats: Record<string, { paid: number; consumed: number }> = {};
  
  // Initialize with trip members and all distinct payers/splits
  const allKnownMembers = Array.from(new Set([
    ...trip.members,
    ...expenses.map(e => e.paidBy || 'Yo'),
    ...expenses.flatMap(e => e.splitBetween || ['Yo'])
  ]));

  allKnownMembers.forEach(m => {
    memberStats[m] = { paid: 0, consumed: 0 };
  });

  expenses.forEach(e => {
    const cost = convertToHomeCurrency(e.amount, e.currency, trip, currentUser.homeCurrency);
    const payer = e.paidBy || 'Yo';
    const splitWith = e.splitBetween && e.splitBetween.length > 0 ? e.splitBetween : ['Yo'];

    if (!memberStats[payer]) memberStats[payer] = { paid: 0, consumed: 0 };
    memberStats[payer].paid += cost;

    const share = cost / splitWith.length;
    splitWith.forEach(person => {
      if (!memberStats[person]) memberStats[person] = { paid: 0, consumed: 0 };
      memberStats[person].consumed += share;
    });
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newMemberName.trim();
    if (!cleanName) return;

    if (trip.members.map(m => m.toLowerCase()).includes(cleanName.toLowerCase())) {
      onShowToast(`"${cleanName}" ya forma parte del grupo.`, 'warning');
      return;
    }

    const updated = [...trip.members, cleanName];
    onUpdateTripMembers(updated);
    setNewMemberName('');
    onShowToast(`¡Viajero/a "${cleanName}" añadido al grupo!`, 'success');
  };

  const handleRemoveMember = (memberToRemove: string) => {
    if (memberToRemove === 'Yo') {
      onShowToast('No puedes eliminar al usuario principal ("Yo").', 'warning');
      return;
    }

    // Check if member is involved in existing expenses
    const isInvolved = expenses.some(e => 
      e.paidBy === memberToRemove || (e.splitBetween && e.splitBetween.includes(memberToRemove))
    );

    if (isInvolved) {
      onShowToast(`No se puede eliminar a "${memberToRemove}" porque tiene gastos o participaciones registradas.`, 'warning');
      return;
    }

    const updated = trip.members.filter(m => m !== memberToRemove);
    onUpdateTripMembers(updated);
    onShowToast(`"${memberToRemove}" removido del grupo.`, 'info');
  };

  const handleCopySummary = () => {
    let text = `✈️ *Resumen de Gastos del Viaje: ${trip.name}*\n`;
    text += `💰 *Gasto Total Compartido:* ${formatMoney(totalSpent, currentUser.homeCurrency)}\n\n`;
    text += `⚖️ *Liquidación de Cuentas (Quién le debe a quién):*\n`;

    if (settlements.length === 0) {
      text += `✅ Todas las cuentas están saldadas al día.\n`;
    } else {
      settlements.forEach((s) => {
        text += `• ${s.from} ➔ le debe transferir a ${s.to}: ${formatMoney(s.amount, currentUser.homeCurrency)}\n`;
      });
    }

    text += `\n📊 *Resumen por Viajero:*\n`;
    Object.entries(memberStats).forEach(([member, st]) => {
      const net = balances[member] || 0;
      const netStr = net > 0.01 
        ? `(+${formatMoney(net, currentUser.homeCurrency)} a favor)` 
        : net < -0.01 
        ? `(${formatMoney(net, currentUser.homeCurrency)} debe)` 
        : '(al día)';
      text += `• ${member}: Pagó ${formatMoney(st.paid, currentUser.homeCurrency)} | Consumió ${formatMoney(st.consumed, currentUser.homeCurrency)} ${netStr}\n`;
    });

    text += `\nGenerado con Rumbio.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('¡Resumen copiado! Listo para pegar en WhatsApp o chat grupal.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> División de Cuentas & Saldos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Algoritmo inteligente de compensación en tiempo real: calcula las transferencias mínimas entre viajeros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenExpenseModal}
            className="bg-slate-900/60 hover:bg-slate-800 text-cyan-300 text-xs font-semibold px-4 py-3 rounded-2xl border border-white/10 flex items-center space-x-1.5 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span>+ Gasto Compartido</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Resumen para WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* Member Management Bar */}
      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-400" /> Integrantes del Grupo ({trip.members.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agrega acompañantes reales para asignarles pagos o dividir cuentas en cada gasto.
            </p>
          </div>

          <form onSubmit={handleAddMember} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              required
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Nombre (ej: Matías, Lucía)..."
              className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none w-full md:w-56"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition whitespace-nowrap active:scale-95 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </form>
        </div>

        {/* Member tags */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
          {trip.members.map((member) => (
            <div
              key={member}
              className="bg-slate-900/70 border border-white/10 rounded-2xl px-3.5 py-1.5 text-xs text-slate-200 flex items-center space-x-2"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-semibold">{member === 'Yo' ? `Yo (${currentUser.name})` : member}</span>
              {member !== 'Yo' && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  className="text-slate-500 hover:text-rose-400 ml-1 transition"
                  title={`Eliminar a ${member}`}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Settlements on Left, Balances on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settlements (Quién le debe a quién) */}
        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 font-display">
              <ArrowLeftRight className="w-4 h-4 text-blue-400" /> Liquidación Óptima de Deudas
            </h3>

            {settlements.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1 font-display">¡Cuentas al Día!</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {expenses.length === 0 
                    ? 'Registra gastos en el viaje indicando quién pagó y entre quiénes se divide para ver el cálculo automático.'
                    : 'No existen deudas pendientes entre los integrantes. Todos los gastos compartidos están equilibrados.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between hover:border-blue-500/30 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-xs border border-rose-500/30">
                        {s.from.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs text-slate-200">
                          <b className="text-white">{s.from}</b> debe transferir a <b className="text-cyan-400">{s.to}</b>
                        </div>
                        <span className="text-[10px] text-slate-500">Transferencia calculada</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-cyan-400 block">
                        {formatMoney(s.amount, currentUser.homeCurrency)}
                      </span>
                      <span className="text-[10px] text-slate-500">Pago pendiente</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Member Balances & Contribution Details */}
        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 font-display">
              <Wallet className="w-4 h-4 text-blue-400" /> Balance Neto por Integrante
            </h3>

            <div className="space-y-3">
              {allKnownMembers.map((member) => {
                const netBalance = balances[member] || 0;
                const rounded = Math.round(netBalance * 100) / 100;
                const isPositive = rounded > 0.01;
                const isNegative = rounded < -0.01;
                const stats = memberStats[member] || { paid: 0, consumed: 0 };

                return (
                  <div
                    key={member}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-900/30 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/30">
                        {member.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {member === 'Yo' ? `Yo (${currentUser.name})` : member}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Pagó: <b className="text-slate-300 font-mono">{formatMoney(stats.paid, currentUser.homeCurrency)}</b> • Consumo: <b className="text-slate-300 font-mono">{formatMoney(stats.consumed, currentUser.homeCurrency)}</b>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-black block ${
                          isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {isPositive
                          ? `+${formatMoney(rounded, currentUser.homeCurrency)}`
                          : isNegative
                          ? formatMoney(rounded, currentUser.homeCurrency)
                          : formatMoney(0, currentUser.homeCurrency)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isPositive ? 'Le deben' : isNegative ? 'Debe' : 'Equilibrado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
