import React, { useState } from 'react';
import { 
  Briefcase, 
  Building, 
  FileText, 
  Download, 
  Sparkles, 
  X, 
  Check, 
  Lock, 
  ShieldCheck, 
  Receipt,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { Trip, Expense, User, UserSubscription, BusinessTripMetadata } from '../types';
import { formatMoney } from '../utils/finance';
import { exportBusinessTripExpenseReportPDF } from '../utils/exportEngine';

interface BusinessTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses: Expense[];
  currentUser: User;
  subscription: UserSubscription | null;
  onUpdateTripMetadata: (metadata: BusinessTripMetadata) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenPlans?: () => void;
}

export const BusinessTripModal: React.FC<BusinessTripModalProps> = ({
  isOpen,
  onClose,
  trip,
  expenses,
  currentUser,
  subscription,
  onUpdateTripMetadata,
  onShowToast,
  onOpenPlans,
}) => {
  const isPremium = subscription?.plan === 'premium';

  const [companyName, setCompanyName] = useState(trip.businessMetadata?.companyName || 'Empresa S.A.');
  const [taxId, setTaxId] = useState(trip.businessMetadata?.taxId || '76.123.456-K');
  const [employeeName, setEmployeeName] = useState(trip.businessMetadata?.employeeName || currentUser.name);
  const [costCenter, setCostCenter] = useState(trip.businessMetadata?.costCenter || 'CC-VENTAS-2026');
  const [projectCode, setProjectCode] = useState(trip.businessMetadata?.projectCode || 'PRJ-EXP-01');
  const [approverName, setApproverName] = useState(trip.businessMetadata?.approverName || 'Gerencia de Finanzas');
  const [travelPurpose, setTravelPurpose] = useState(trip.businessMetadata?.travelPurpose || 'Reuniones comerciales y visita a clientes');
  
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const tripExpenses = expenses.filter(e => e.tripId === trip.id);
  const deductibleExpenses = tripExpenses.filter(e => e.isTaxDeductible !== false);

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    const metadata: BusinessTripMetadata = {
      companyName,
      taxId,
      employeeName,
      costCenter,
      projectCode,
      approverName,
      travelPurpose,
    };
    onUpdateTripMetadata(metadata);
    onShowToast('Configuración corporativa guardada.', 'success');
  };

  const handleGenerateCorporatePDF = async () => {
    if (!isPremium) {
      onShowToast('La generación de reportes de rendición corporativa requiere el Plan Premium.', 'info');
      onOpenPlans?.();
      return;
    }

    try {
      setIsExporting(true);
      const metadata: BusinessTripMetadata = {
        companyName,
        taxId,
        employeeName,
        costCenter,
        projectCode,
        approverName,
        travelPurpose,
      };

      await exportBusinessTripExpenseReportPDF({
        trip,
        expenses: tripExpenses,
        user: currentUser,
        metadata,
      });

      onShowToast('¡Planilla de Rendición Oficial descargada en formato PDF!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error exporting business PDF:', err);
      onShowToast('Error al generar la rendición corporativa en PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">Modo Viaje de Negocios & Rendición</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                    Premium
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Genera informes ejecutivos de rendición de gastos con datos de empresa, RUT/Tax ID, boletas y firmas de aprobación.
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
          <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-emerald-200">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>El Modo Negocios y las planillas oficiales de rendición de gastos requieren el <b>Plan Premium</b>.</span>
            </div>
            {onOpenPlans && (
              <button
                onClick={() => { onClose(); onOpenPlans(); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shrink-0 transition"
              >
                Ver Plan Premium
              </button>
            )}
          </div>
        )}

        {/* Form area */}
        <form onSubmit={handleSaveMetadata} className="overflow-y-auto space-y-4 pr-1 relative z-10 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span>Razón Social / Empresa:</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Inversiones Rumbio SpA"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>RUT / RFC / Tax ID Empresa:</span>
              </label>
              <input
                type="text"
                required
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Ej: 76.890.123-4"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nombre del Trabajador / Rendidor:</span>
              </label>
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Centro de Costos / Proyecto:</span>
              </label>
              <input
                type="text"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="Ej: CC-OPERACIONES-2026"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Motivo del Viaje / Justificación de Gastos:</label>
            <input
              type="text"
              value={travelPurpose}
              onChange={(e) => setTravelPurpose(e.target.value)}
              placeholder="Ej: Asistencia a congreso y prospección comercial"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quick Expense Audit Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider">Resumen de Rendición</span>
              <span className="text-emerald-400 font-bold font-mono">
                {tripExpenses.length} comprobantes ({deductibleExpenses.length} facturas/boletas)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              El informe PDF incluirá el membrete corporativo, tabla detallada de facturas con desglose de IVA/Tax, resumen por centro de costos y casillas para firma del empleado y jefatura aprobatoria.
            </p>
          </div>
        </form>

        {/* Actions */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Cerrar
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleGenerateCorporatePDF}
              disabled={isExporting || tripExpenses.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generando PDF...' : 'Descargar Rendición Oficial PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
