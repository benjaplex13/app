import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Tag
} from 'lucide-react';
import { Trip, ChecklistItem, User } from '../types';
import { formatMoney } from '../utils/finance';

interface ChecklistViewProps {
  trip: Trip;
  currentUser: User;
  onUpdateChecklist: (items: ChecklistItem[]) => void;
  onShowToast: (msg: string, type: 'success' | 'info') => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  trip,
  currentUser,
  onUpdateChecklist,
  onShowToast,
}) => {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    if (trip.checklist && trip.checklist.length > 0) return trip.checklist;
    return [
      { id: 'chk_1', title: 'Comprar boletos de avión / tren', isCompleted: true, category: 'Transporte', amount: 450, dueDate: trip.startDate },
      { id: 'chk_2', title: 'Reservar seguro de viaje internacional', isCompleted: false, category: 'Otros', amount: 65, dueDate: trip.startDate },
      { id: 'chk_3', title: 'Comprar tarjeta eSIM / Datos móviles', isCompleted: false, category: 'Otros', amount: 25 },
      { id: 'chk_4', title: 'Reservar entradas anticipadas para museos y atracciones', isCompleted: false, category: 'Actividades', amount: 80 },
    ];
  });

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Otros');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const completedCount = items.filter(i => i.isCompleted).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const pendingAmount = items
    .filter(i => !i.isCompleted && i.amount)
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleToggle = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, isCompleted: !item.isCompleted };
      }
      return item;
    });
    setItems(updated);
    onUpdateChecklist(updated);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    onUpdateChecklist(updated);
    onShowToast('Tarea eliminada del checklist.', 'info');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: 'chk_' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      amount: newAmount ? parseFloat(newAmount) : undefined,
      dueDate: newDueDate || undefined,
      isCompleted: false,
    };

    const updated = [newItem, ...items];
    setItems(updated);
    onUpdateChecklist(updated);
    setNewTitle('');
    setNewAmount('');
    setNewDueDate('');
    onShowToast('Nueva tarea de viaje añadida.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" /> Checklist & Pagos Previos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lleva el control de reservas pendientes, pasajes, seguros y pagos por liquidar antes de partir.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="p-4 bg-slate-900/60 rounded-[20px] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Pendiente por Pagar</span>
            <span className="text-sm font-mono font-black text-amber-300">
              {formatMoney(pendingAmount, currentUser.homeCurrency)}
            </span>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-[20px] border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Progreso</span>
            <span className="text-sm font-mono font-black text-cyan-400">
              {completedCount}/{items.length} ({progressPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Add New Item Form */}
      <form onSubmit={handleAddItem} className="bg-white/5 p-6 rounded-[32px] border border-white/5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-display">
          <Plus className="w-4 h-4 text-blue-400" /> Añadir Tarea o Reserva al Checklist
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej: Comprar seguro de viaje médico"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <input
              type="number"
              step="any"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder={`Costo (${currentUser.homeCurrency})`}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </div>
        </div>
      </form>

      {/* Checklist Items List */}
      <div className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden divide-y divide-white/5 shadow-xl">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No tienes tareas pendientes en tu checklist.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 flex items-center justify-between transition ${
                item.isCompleted ? 'bg-slate-950/40 opacity-60' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                    item.isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border-2 border-slate-600 hover:border-blue-400 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                </button>

                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs sm:text-sm font-semibold block truncate ${
                      item.isCompleted ? 'line-through text-slate-500' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    {item.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" /> {item.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {item.amount !== undefined && (
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {formatMoney(item.amount, currentUser.homeCurrency)}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-white/5 transition"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
