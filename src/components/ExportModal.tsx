import React, { useState } from 'react';
import { FileText, Download, Sparkles, X, FileSpreadsheet, Braces, CheckCircle2, Loader2, Calendar, MapPin, Briefcase } from 'lucide-react';
import { Trip, Expense, User } from '../types';
import { exportTripToProfessionalPDF, exportBusinessTripExpenseReportPDF, downloadStructuredJSON } from '../utils/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTripId: string | null;
  expenses: Expense[];
  currentUser: User;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTripId,
  expenses,
  currentUser,
  onShowToast,
}) => {
  const [selectedTripId, setSelectedTripId] = useState<string>(activeTripId || (trips[0]?.id || ''));
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingBusinessPdf, setIsExportingBusinessPdf] = useState(false);
  const [exportProgressText, setExportProgressText] = useState('');
  const [isExportingJson, setIsExportingJson] = useState(false);

  if (!isOpen) return null;

  const currentSelectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const tripExpenses = currentSelectedTrip
    ? expenses.filter((e) => e.tripId === currentSelectedTrip.id)
    : [];

  const handleExportPdf = async () => {
    if (!currentSelectedTrip) {
      onShowToast('Selecciona un viaje para generar el PDF.', 'error');
      return;
    }

    try {
      setIsExportingPdf(true);
      setExportProgressText('Iniciando análisis financiero...');
      
      await exportTripToProfessionalPDF({
        trip: currentSelectedTrip,
        expenses: tripExpenses,
        user: currentUser,
        onProgress: (step) => setExportProgressText(step),
      });

      onShowToast('Informe PDF con Resumen IA descargado con éxito.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      onShowToast('Hubo un problema al generar el documento PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
      setExportProgressText('');
    }
  };

  const handleExportBusinessPdf = async () => {
    if (!currentSelectedTrip) {
      onShowToast('Selecciona un viaje para generar el informe corporativo.', 'error');
      return;
    }

    try {
      setIsExportingBusinessPdf(true);
      await exportBusinessTripExpenseReportPDF({
        trip: currentSelectedTrip,
        expenses: tripExpenses,
        user: currentUser,
      });

      onShowToast('Planilla oficial de rendición de gastos descargada con éxito.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error exporting business PDF:', err);
      onShowToast('Error al generar la rendición corporativa.', 'error');
    } finally {
      setIsExportingBusinessPdf(false);
    }
  };

  const handleExportJson = () => {
    try {
      setIsExportingJson(true);
      downloadStructuredJSON(currentUser, trips, expenses);
      onShowToast('Exportación JSON estructurada descargada con éxito.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error exporting JSON:', err);
      onShowToast('No se pudo generar el archivo JSON.', 'error');
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleExportCsv = () => {
    if (!currentSelectedTrip) {
      onShowToast('Selecciona un viaje para exportar CSV.', 'error');
      return;
    }

    try {
      const headers = ['Fecha', 'Concepto', 'Categoria', 'Monto Original', 'Moneda', 'Pagado Por', 'Notas'];
      const rows = tripExpenses.map(e => [
        `"${e.date || ''}"`,
        `"${(e.title || '').replace(/"/g, '""')}"`,
        `"${e.category || ''}"`,
        e.amount,
        `"${e.currency}"`,
        `"${(e.paidBy || currentUser.name).replace(/"/g, '""')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const cleanName = (currentSelectedTrip.destination || currentSelectedTrip.name).replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `Rumbio_${cleanName}_Gastos.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('Planilla CSV descargada con éxito.', 'success');
      onClose();
    } catch (err) {
      onShowToast('Error al exportar CSV.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Download className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Exportación Profesional</h2>
            </div>
            <p className="text-xs text-slate-400">
              Genera informes ejecutivos, respaldos estructurados y hojas de cálculo listas para presentar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trip Selector (If user has trips) */}
        {trips.length > 0 && (
          <div className="space-y-2 relative z-10">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Viaje a exportar:</span>
            </label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white font-medium focus:border-blue-500 focus:outline-none"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-white">
                  {t.name} ({t.destination || 'Sin destino'}) — {t.currency}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Export Formats Grid */}
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {/* Format 1: Professional PDF with AI Executive Summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 hover:border-blue-500/60 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 mt-0.5">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">Informe Ejecutivo PDF</span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    <span>Con Resumen IA</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                  Documento formal con logo Rumbio, síntesis generada por IA, métricas clave, gráficos de categorías y tabla detallada.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || trips.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 disabled:opacity-50 shrink-0"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-xs">{exportProgressText || 'Procesando...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Format 1b: Corporate Business Trip Expense Reimbursement PDF (Premium) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">Planilla Oficial de Rendición de Negocios</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Modo Empresa
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                  Documento de rendición corporativa con desglose de facturas/boletas, RUT/Tax ID, centros de costos y casillas de firma.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportBusinessPdf}
              disabled={isExportingBusinessPdf || trips.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 disabled:opacity-50 shrink-0"
            >
              {isExportingBusinessPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Rendición</span>
                </>
              )}
            </button>
          </div>

          {/* Format 2: Structured Hierarchical JSON */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                <Braces className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">Respaldo JSON Estructurado</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    v2.1 Schema
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                  Exportación enriquecida con análisis de portafolio, balances grupales, categorías y desglose de todos tus viajes.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportJson}
              disabled={isExportingJson}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-white/10 flex items-center justify-center space-x-2 disabled:opacity-50 shrink-0"
            >
              {isExportingJson ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar JSON</span>
                </>
              )}
            </button>
          </div>

          {/* Format 3: CSV Spreadsheet */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white text-sm">Planilla CSV / Excel</span>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                  Archivo delimitado por comas con codificación UTF-8 para abrir directamente en Microsoft Excel, Numbers o Google Sheets.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={trips.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-white/10 flex items-center justify-center space-x-2 disabled:opacity-50 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        {/* Footer info note */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
          <span>Los reportes incluyen conversión automática a tu moneda base ({currentUser.homeCurrency}).</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-medium">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
