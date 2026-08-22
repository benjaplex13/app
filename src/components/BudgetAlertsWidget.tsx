import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  CheckCircle2, 
  Mail, 
  Sparkles, 
  ShieldAlert, 
  Send, 
  Loader2,
  Crown
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription, ExpenseCategory } from '../types';
import { ALL_CATEGORIES } from '../data/currencies';
import { convertToHomeCurrency, formatMoney, getCategoryBreakdown } from '../utils/finance';
import { api } from '../utils/api';

interface BudgetAlertsWidgetProps {
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  subscription: UserSubscription | null;
  onOpenUpgradeGate: (title: string, desc: string) => void;
  onShowToast: (msg: string, type: 'success' | 'warning' | 'info' | 'error') => void;
}

export const BudgetAlertsWidget: React.FC<BudgetAlertsWidgetProps> = ({
  trip,
  expenses,
  currentUser,
  subscription,
  onOpenUpgradeGate,
  onShowToast,
}) => {
  const isPro = subscription ? subscription.plan !== 'free' : false;
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(() => {
    return localStorage.getItem(`rumbio_email_alerts_${currentUser.id}`) === 'true';
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Compute overall budget percentage
  const totalSpentHome = expenses.reduce((acc, curr) => {
    return acc + convertToHomeCurrency(curr.amount, curr.currency, trip, currentUser.homeCurrency);
  }, 0);
  const overallPercentage = trip.budget > 0 ? (totalSpentHome / trip.budget) * 100 : 0;

  // Compute category percentages
  const categoryBreakdown = getCategoryBreakdown(expenses, trip, currentUser.homeCurrency);
  
  interface AlertItem {
    category: string;
    spent: number;
    budget: number;
    percentage: number;
    threshold: 80 | 100;
  }

  const activeAlerts: AlertItem[] = [];

  // Check overall trip
  if (trip.budget > 0) {
    if (overallPercentage >= 100) {
      activeAlerts.push({
        category: 'Presupuesto Total del Viaje',
        spent: totalSpentHome,
        budget: trip.budget,
        percentage: overallPercentage,
        threshold: 100,
      });
    } else if (overallPercentage >= 80) {
      activeAlerts.push({
        category: 'Presupuesto Total del Viaje',
        spent: totalSpentHome,
        budget: trip.budget,
        percentage: overallPercentage,
        threshold: 80,
      });
    }
  }

  // Check categories
  (trip.plans || []).forEach((p) => {
    if (p.estimatedAmount > 0) {
      const spent = categoryBreakdown[p.category] || 0;
      const pct = (spent / p.estimatedAmount) * 100;
      if (pct >= 100) {
        activeAlerts.push({
          category: p.category,
          spent,
          budget: p.estimatedAmount,
          percentage: pct,
          threshold: 100,
        });
      } else if (pct >= 80) {
        activeAlerts.push({
          category: p.category,
          spent,
          budget: p.estimatedAmount,
          percentage: pct,
          threshold: 80,
        });
      }
    }
  });

  const handleToggleEmailAlerts = () => {
    if (!isPro) {
      onOpenUpgradeGate(
        'Alertas de Presupuesto por Correo (Pro)',
        'Recibe notificaciones automáticas en tu bandeja de entrada cuando te acerques al 80% o al 100% de tus topes de viaje. Función exclusiva para planes Pro y Premium.'
      );
      return;
    }
    const newVal = !emailAlertsEnabled;
    setEmailAlertsEnabled(newVal);
    localStorage.setItem(`rumbio_email_alerts_${currentUser.id}`, newVal ? 'true' : 'false');
    onShowToast(
      newVal ? 'Notificaciones por correo de presupuesto activadas.' : 'Notificaciones por correo desactivadas.',
      'info'
    );
  };

  const handleSendTestAlert = async () => {
    if (!isPro) {
      onOpenUpgradeGate(
        'Alertas Inteligentes de Presupuesto (Pro)',
        'Prueba el envío instantáneo de alertas de sobregiro y avisos de presupuesto a tu correo.'
      );
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await api.sendBudgetAlertNotification({
        tripName: trip.name,
        category: activeAlerts[0]?.category || 'General',
        threshold: activeAlerts[0]?.threshold || 80,
        spent: activeAlerts[0]?.spent || totalSpentHome,
        budget: activeAlerts[0]?.budget || trip.budget,
        currency: currentUser.homeCurrency,
        sendEmail: true,
      });

      if (res.success) {
        onShowToast(
          res.alert.emailSent 
            ? `¡Alerta enviada con éxito a ${currentUser.email}!` 
            : 'Alerta registrada en el sistema de eventos de Rumbio.',
          'success'
        );
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error al enviar alerta por correo.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="bg-[#0b101e] border border-blue-500/20 rounded-[28px] p-6 text-white space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            {activeAlerts.length > 0 ? <BellRing className="w-5 h-5 animate-bounce" /> : <Bell className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base font-display text-white">Alertas Inteligentes de Presupuesto</h3>
              <span className="text-[9px] uppercase tracking-wider font-extrabold bg-blue-900/60 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                Plan Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Detección automática al 80% (aviso preventivo) y al 100% (sobregiro alcanzado)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEmailAlerts}
            className={`text-xs px-3.5 py-1.5 rounded-xl border flex items-center space-x-1.5 transition ${
              emailAlertsEnabled && isPro
                ? 'bg-blue-600/30 border-blue-400 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{emailAlertsEnabled && isPro ? 'Email Activado' : 'Activar por Email'}</span>
          </button>

          {isPro && (
            <button
              onClick={handleSendTestAlert}
              disabled={isSendingTest}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl flex items-center space-x-1 transition disabled:opacity-50"
            >
              {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Probar Alerta</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Alerts List */}
      {activeAlerts.length === 0 ? (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center space-x-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <b>¡Todo en orden!</b> Ninguna categoría ni el total del viaje ha superado el 80% del presupuesto asignado.
          </span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeAlerts.map((alt, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                alt.threshold === 100
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className={`w-4 h-4 shrink-0 ${alt.threshold === 100 ? 'text-rose-400' : 'text-amber-400'}`} />
                <div>
                  <span className="font-bold text-white block">
                    {alt.threshold === 100 ? '🚨 Límite del 100% Superado' : '⚡ 80% del Presupuesto Consumido'}: {alt.category}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Has gastado {formatMoney(alt.spent, currentUser.homeCurrency)} de un tope de {formatMoney(alt.budget, currentUser.homeCurrency)} ({Math.round(alt.percentage)}%)
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className={`font-mono font-bold text-sm ${alt.threshold === 100 ? 'text-rose-400' : 'text-amber-300'}`}>
                  {Math.round(alt.percentage)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
