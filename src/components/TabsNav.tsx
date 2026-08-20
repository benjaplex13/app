import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Users, 
  Calculator, 
  CheckSquare, 
  UserCog,
  Crown
} from 'lucide-react';
import { TabType, PlanTier } from '../types';

interface TabsNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  expenseCount: number;
  pendingChecklistCount: number;
  userPlan?: PlanTier;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  currentTab,
  onTabChange,
  expenseCount,
  pendingChecklistCount,
  userPlan = 'free',
}) => {
  const tabs = [
    { id: 'overview' as TabType, label: 'Resumen & Gráficos', icon: LayoutDashboard },
    { id: 'expenses' as TabType, label: 'Gastos', icon: Receipt, badge: expenseCount > 0 ? expenseCount : undefined },
    { id: 'budget' as TabType, label: 'Presupuesto & Alertas', icon: PieChart },
    { id: 'split' as TabType, label: 'Dividir Cuentas (Split)', icon: Users },
    { id: 'planner' as TabType, label: 'Planificación Previa', icon: Calculator },
    { id: 'checklist' as TabType, label: 'Checklist & Pagos', icon: CheckSquare, badge: pendingChecklistCount > 0 ? pendingChecklistCount : undefined, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { 
      id: 'plans' as TabType, 
      label: 'Planes & Precios', 
      icon: Crown, 
      badge: userPlan !== 'free' ? userPlan.toUpperCase() : 'MEJORAR',
      badgeColor: userPlan === 'premium' 
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
        : userPlan === 'pro'
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400/40'
    },
    { id: 'profile' as TabType, label: 'Mi Perfil & Divisas', icon: UserCog },
  ];

  return (
    <div className="bg-[#050811]/90 border-b border-white/5 sticky top-20 z-30 backdrop-blur-md overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 py-3 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                    tab.badgeColor || 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
