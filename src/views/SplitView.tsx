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
  Crown,
  Lock,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription, CurrencyCode } from '../types';
import { calculateSplitDebts, formatMoney, convertToHomeCurrency } from '../utils/finance';
import { hasTierAccess, hasUnlimitedAccess } from '../data/plans';

interface SplitViewProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  userSubscription?: UserSubscription | null;
  onOpenPlans?: () => void;
  onUpdateTripMembers: (newMembers: string[]) => void;
  onOpenExpenseModal: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  trip,
  expenses,
  currentUser,
  userSubscription,
  onOpenPlans,
  onUpdateTripMembers,
  onOpenExpenseModal,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showExplainGuide, setShowExplainGuide] = useState(false);
  const [settlementCurrency, setSettlementCurrency] = useState<CurrencyCode>(currentUser.homeCurrency);

  const canSplit = hasUnlimitedAccess(userSubscription) || (userSubscription?.limits.canSplitExpenses ?? true);
  const canAutoSettle = hasUnlimitedAccess(userSubscription) || (userSubscription?.limits.canAutoSettleDebts ?? false);
  const isPremium = hasTierAccess(userSubscription, 'premium');

  const { settlements, balances, totalSpent } = calculateSplitDebts(expenses, trip, settlementCurrency);

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
    const cost = convertToHomeCurrency(e.amount, e.currency, trip, settlementCurrency);
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

    if (cleanName.toLowerCase() === 'yo' || cleanName.toLowerCase() === currentUser.name.toLowerCase()) {
      onShowToast(`Ya estás registrado en el viaje como usuario principal ("Yo - ${currentUser.name}").`, 'info');
      setNewMemberName('');
      return;
    }

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
      {/* Plan Gate Banner for Free users */}
      {!canSplit && (
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-cyan-950/80 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Función Pro / Premium
                </span>
                <span className="text-sm font-bold text-white">División Grupal de Gastos</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
                La división de cuentas y el cálculo inteligente de transferencias entre múltiples viajeros está disponible en los planes Pro y Premium.
              </p>
            </div>
          </div>

          {onOpenPlans && (
            <button
              onClick={onOpenPlans}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 shrink-0 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Desbloquear Planes</span>
            </button>
          )}
        </div>
      )}

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
            onClick={() => setShowExplainGuide(!showExplainGuide)}
            className="bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 text-xs font-semibold px-4 py-3 rounded-2xl border border-blue-500/30 flex items-center space-x-1.5 transition active:scale-95 shadow-md"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>{showExplainGuide ? 'Ocultar Guía' : '¿Cómo se calcula? (Ejemplo)'}</span>
            {showExplainGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

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

      {/* Interactive Explanation Guide (Benjamin vs Ariel Example) */}
      {showExplainGuide && (
        <div className="bg-gradient-to-br from-slate-900 via-[#0c1427] to-blue-950 p-6 sm:p-7 rounded-[32px] border border-cyan-500/30 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  ¿Cómo funciona la lógica de compensación en Rumbio?
                </h3>
                <p className="text-xs text-slate-300">
                  Entendiendo quién desembolsó el dinero real y quién le debe transferir a quién.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExplainGuide(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition text-xs"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Rule 1 & 2 */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] block">
                1. Las 2 Reglas de Oro Financieras
              </span>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">➕</span>
                  <span><b>¿Quién Pagó?:</b> La persona que sacó el dinero de su bolsillo acumula saldo <b>a favor (+ crédito)</b> por el monto total pagado.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">➖</span>
                  <span><b>¿Entre quiénes se divide?:</b> Cada participante que disfrutó del consumo resta su cuota equivalente <b>(- débito)</b>.</span>
                </li>
              </ul>
            </div>

            {/* Practical Example */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] block">
                2. Ejemplo Práctico: Benjamín y Ariel
              </span>
              <p className="text-slate-300 leading-relaxed">
                Supongamos que <b>Ariel</b> paga <b>$5.000 CLP</b> en un almuerzo y comen <b>Benjamín y Ariel</b>:
              </p>
              <div className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-500/20 text-slate-200 text-[11px] space-y-1">
                <p>• <b>Ariel:</b> Pagó $5.000, su consumo propio fue $2.500 ➔ <b>Saldo a favor: +$2.500</b></p>
                <p>• <b>Benjamín:</b> Consumió $2.500 y pagó $0 ➔ <b>Saldo deudor: -$2.500</b></p>
                <p className="text-cyan-300 font-bold pt-1 border-t border-white/10">
                  👉 Resultado Rumbio: <b>Benjamín le debe transferir $2.500 a Ariel.</b>
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-1">
            <b className="flex items-center gap-1.5 text-amber-300">
              <Info className="w-4 h-4" /> ¿Por qué a veces salía que Ariel debía pagarle a Benjamín?
            </b>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Al crear un gasto, el formulario tiene predeterminado el campo <b>"¿Quién Pagó?"</b> como <i>"Yo (Benjamín)"</i>. Si al registrar el gasto de $5.000 no se cambió el pagador a <b>"Ariel"</b>, Rumbio entendió que fue Benjamín quien pagó los $5.000 y que Ariel no pagó nada, por eso le cobraba a Ariel. 
              <br />
              <span className="text-cyan-300 font-semibold">Solución rápida:</span> Ve a la pestaña <b>Gastos</b>, edita el gasto, cambia el campo <b>"¿Quién Pagó?"</b> a <b>Ariel</b> y guarda. El balance se corregirá automáticamente.
            </p>
          </div>
        </div>
      )}

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

      {/* Multi-Currency Settlement Toolbar (Premium) */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Liquidación Multi-Moneda:</span>
          <span className="text-xs text-slate-400">Ver saldos y deudas convertidos a:</span>
        </div>

        <div className="flex items-center space-x-2">
          {[
            { code: currentUser.homeCurrency, label: `Mi Moneda (${currentUser.homeCurrency})` },
            { code: trip.currency, label: `Moneda Destino (${trip.currency})` },
            { code: 'USD', label: 'Dólares (USD)' },
            { code: 'EUR', label: 'Euros (EUR)' },
          ].map((curr) => (
            <button
              key={curr.code}
              type="button"
              onClick={() => setSettlementCurrency(curr.code as CurrencyCode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                settlementCurrency === curr.code
                  ? 'bg-blue-600 border-cyan-400 text-white shadow-md'
                  : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {curr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Settlements on Left, Balances on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settlements (Quién le debe a quién) */}
        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 font-display">
              <ArrowLeftRight className="w-4 h-4 text-blue-400" /> Liquidación Óptima de Deudas ({settlementCurrency})
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
                        {formatMoney(s.amount, settlementCurrency)}
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
              <Wallet className="w-4 h-4 text-blue-400" /> Balance Neto por Integrante ({settlementCurrency})
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
                          Pagó: <b className="text-slate-300 font-mono">{formatMoney(stats.paid, settlementCurrency)}</b> • Consumo: <b className="text-slate-300 font-mono">{formatMoney(stats.consumed, settlementCurrency)}</b>
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
                          ? `+${formatMoney(rounded, settlementCurrency)}`
                          : isNegative
                          ? formatMoney(rounded, settlementCurrency)
                          : formatMoney(0, settlementCurrency)}
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

      {/* Itemized Shared Expenses Ledger */}
      <div className="bg-white/5 p-6 sm:p-8 rounded-[32px] border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-display">
              <Receipt className="w-4 h-4 text-cyan-400" /> Registro Detallado de Gastos Compartidos ({expenses.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoría de quién pagó cada cuenta y la cuota exacta asignada a cada acompañante.
            </p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic">
            Aún no hay gastos registrados en este viaje.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map((expense) => {
              const costHome = convertToHomeCurrency(expense.amount, expense.currency, trip, currentUser.homeCurrency);
              const payerName = expense.paidBy === 'Yo' ? `Yo (${currentUser.name})` : (expense.paidBy || 'Yo');
              const participants = expense.splitBetween && expense.splitBetween.length > 0 ? expense.splitBetween : ['Yo'];
              const sharePerPerson = costHome / participants.length;

              return (
                <div key={expense.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{expense.title}</span>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        {expense.date || 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                      <span className="flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">💳 Pagó:</span>
                        <b className="text-white">{payerName}</b>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="text-cyan-400 font-bold">👥 Dividido entre ({participants.length}):</span>
                        <span>{participants.map(p => p === 'Yo' ? `Yo (${currentUser.name})` : p).join(', ')}</span>
                      </span>
                      <span>•</span>
                      <span>Cuota c/u: <b className="font-mono text-cyan-300">{formatMoney(sharePerPerson, currentUser.homeCurrency)}</b></span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-white block">
                      {formatMoney(expense.amount, expense.currency)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatMoney(costHome, currentUser.homeCurrency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
