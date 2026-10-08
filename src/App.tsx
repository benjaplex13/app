import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Trip, 
  Expense, 
  TabType, 
  ToastNotification, 
  CurrencyCode,
  ChecklistItem,
  PlanItem,
  UserSubscription,
  PlanTier
} from './types';
import { api, getStoredToken, removeStoredToken } from './utils/api';
import { convertToHomeCurrency } from './utils/finance';
import confetti from 'canvas-confetti';
import { AuthView } from './views/AuthView';
import { OverviewView } from './views/OverviewView';
import { ExpensesView } from './views/ExpensesView';
import { BudgetView } from './views/BudgetView';
import { SplitView } from './views/SplitView';
import { PlannerView } from './views/PlannerView';
import { ChecklistView } from './views/ChecklistView';
import { ProfileView } from './views/ProfileView';
import { PlansView } from './views/PlansView';
import { ChatView } from './views/ChatView';
import { Navbar } from './components/Navbar';
import { TabsNav } from './components/TabsNav';
import { TripModal } from './components/TripModal';
import { ExpenseModal } from './components/ExpenseModal';
import { QuickExpenseModal } from './components/QuickExpenseModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ToastContainer } from './components/ToastContainer';
import { LogoBrandModal } from './components/LogoBrandModal';
import { PlanGateModal } from './components/PlanGateModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ExportModal } from './components/ExportModal';
import { BankSyncModal } from './components/BankSyncModal';
import { BusinessTripModal } from './components/BusinessTripModal';
import { CrossTripAnalyticsModal } from './components/CrossTripAnalyticsModal';
import { AiChatFloatingWidget } from './components/AiChatFloatingWidget';
import { LogoConcept } from './components/RumbioLogo';
import { downloadStructuredJSON } from './utils/exportEngine';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { PwaCompactWidget } from './components/PwaCompactWidget';
import { LegalModal, LegalTab } from './components/LegalModal';
import { CookieBanner } from './components/CookieBanner';
import { NotFoundView } from './views/NotFoundView';
import { Compass, Plus, Loader2, ShieldCheck } from 'lucide-react';

const checkIsQuickAddRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path === '/quick-add' ||
    path === '/quick-add/' ||
    path.startsWith('/quick-add') ||
    path === '/quick' ||
    path === '/quick/' ||
    search.includes('quick-add') ||
    search.includes('quick_add') ||
    search.includes('shortcut=quick') ||
    hash.includes('quick-add')
  );
};

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  // Plan Gate Modal & Direct Checkout
  const [isPlanGateOpen, setIsPlanGateOpen] = useState(false);
  const [checkoutPlanModal, setCheckoutPlanModal] = useState<PlanTier | null>(null);
  const [planGateInfo, setPlanGateInfo] = useState<{
    title?: string;
    description?: string;
    requiredPlan?: PlanTier;
  }>({});

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Brand Concept
  const [logoConcept, setLogoConcept] = useState<LogoConcept>(() => {
    return (localStorage.getItem('rumbio_logo_concept') as LogoConcept) || 'growth-compass';
  });
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  // Modals
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Premium Feature Modals (Block 2)
  const [isBankSyncModalOpen, setIsBankSyncModalOpen] = useState(false);
  const [isBusinessTripModalOpen, setIsBusinessTripModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Legal & Trust Modal (Block 1)
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  // Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      const id = 'toast_' + Date.now() + Math.random().toString(36).substr(2, 4);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Subscription details
  const fetchSubscription = useCallback(async () => {
    try {
      const sub = await api.getSubscription();
      setSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Error fetching subscription:', err);
      return null;
    }
  }, []);

  // Load Trips & Expenses from Server
  const loadUserTrips = async (preserveActiveId?: string | null): Promise<Trip[]> => {
    try {
      const userTrips = await api.getTrips();
      setTrips(userTrips);

      if (userTrips.length > 0) {
        const targetId = preserveActiveId && userTrips.some(t => t.id === preserveActiveId)
          ? preserveActiveId
          : userTrips[0].id;
        setActiveTripId(targetId);
        const tripExpenses = await api.getExpenses(targetId);
        setExpenses(tripExpenses);
      } else {
        setActiveTripId(null);
        setExpenses([]);
      }
      return userTrips;
    } catch (err: any) {
      console.error('Error loading trips from API:', err);
      return [];
    }
  };

  // Check existing session, quick-add direct route, and payment return on mount
  useEffect(() => {
    const isQuick = checkIsQuickAddRoute();
    if (isQuick) {
      try {
        sessionStorage.setItem('rumbio_pending_quick_add', 'true');
      } catch {}
    }

    const initAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          const loadedTrips = await loadUserTrips();
          await fetchSubscription();

          // Check if quick add route was requested
          const shouldTriggerQuickAdd = isQuick || sessionStorage.getItem('rumbio_pending_quick_add') === 'true';
          if (shouldTriggerQuickAdd) {
            try {
              sessionStorage.removeItem('rumbio_pending_quick_add');
            } catch {}
            // Normalize URL to / so user stays in dashboard normally afterwards
            window.history.replaceState({}, document.title, '/');

            if (loadedTrips.length > 0) {
              setIsQuickExpenseOpen(true);
            } else {
              showToast('Crea tu primer viaje para comenzar a registrar gastos con Registro Rápido.', 'info');
              setIsTripModalOpen(true);
            }
          }

          // Check if returning from Flow.cl payment
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('payment') === 'flow_return') {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#0ea5e9', '#38bdf8', '#38ef7d', '#f59e0b', '#ffffff']
            });
            showToast('¡Pago procesado con Flow.cl! Tu plan ha sido actualizado.', 'success');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            setCurrentTab('plans');
          }
        } catch {
          removeStoredToken();
          setCurrentUser(null);
        }
      }
      setIsInitialLoading(false);
    };

    initAuth();
  }, [fetchSubscription, showToast]);

  // Reload expenses when activeTripId changes
  useEffect(() => {
    let cancelled = false;
    if (currentUser && activeTripId) {
      const requestedTripId = activeTripId;
      api.getExpenses(requestedTripId)
        .then((data) => {
          if (!cancelled && requestedTripId === activeTripId) setExpenses(data);
        })
        .catch((err) => {
          if (!cancelled) console.error('Error loading expenses:', err);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [activeTripId, currentUser]);

  // Listen for browser popstate / back navigation into /quick-add
  useEffect(() => {
    const handlePopState = () => {
      if (checkIsQuickAddRoute() && currentUser) {
        window.history.replaceState({}, document.title, '/');
        if (trips.length > 0) {
          setIsQuickExpenseOpen(true);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, trips]);

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    const loadedTrips = await loadUserTrips();
    await fetchSubscription();

    const wasPendingQuickAdd = 
      checkIsQuickAddRoute() || 
      sessionStorage.getItem('rumbio_pending_quick_add') === 'true';

    if (wasPendingQuickAdd) {
      try {
        sessionStorage.removeItem('rumbio_pending_quick_add');
      } catch {}
      window.history.replaceState({}, document.title, '/');

      if (loadedTrips.length > 0) {
        setIsQuickExpenseOpen(true);
      } else {
        showToast('Crea tu primer viaje para comenzar a registrar gastos con Registro Rápido.', 'info');
        setIsTripModalOpen(true);
      }
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    setTrips([]);
    setExpenses([]);
    setSubscription(null);
    setActiveTripId(null);
    showToast('Has cerrado sesión de forma segura.', 'info');
  };

  const openUpgradeGate = (
    featureTitleOrOpts: string | { title?: string; description?: string; requiredPlan?: PlanTier },
    featureDescription: string = '',
    requiredPlan: PlanTier = 'pro'
  ) => {
    if (typeof featureTitleOrOpts === 'object') {
      setPlanGateInfo({
        title: featureTitleOrOpts.title || 'Función Avanzada',
        description: featureTitleOrOpts.description || 'Actualiza tu plan para desbloquear esta herramienta exclusiva.',
        requiredPlan: featureTitleOrOpts.requiredPlan || 'pro',
      });
    } else {
      setPlanGateInfo({
        title: featureTitleOrOpts,
        description: featureDescription,
        requiredPlan,
      });
    }
    setIsPlanGateOpen(true);
  };

  // Trip operations
  const handleSaveTrip = async (tripData: Partial<Trip>) => {
    if (!currentUser) return;

    // Check client-side plan limits for new trips
    if (!editingTrip && trips.length >= (subscription?.limits.maxActiveTrips ?? 1)) {
      openUpgradeGate(
        'Límite de 2 viajes en el Plan Gratis',
        'Has alcanzado el límite de 2 viajes activos del plan Gratis. Actualiza a Pro o Premium para crear viajes ilimitados.',
        'pro'
      );
      return;
    }

    try {
      const saved = await api.saveTrip(tripData);
      setIsTripModalOpen(false);
      setEditingTrip(null);
      await loadUserTrips(saved.id);
      showToast(editingTrip ? 'Viaje actualizado exitosamente.' : '¡Nuevo viaje creado y guardado en backend!', 'success');
    } catch (err: any) {
      if (err.data?.code === 'PLAN_LIMIT_EXCEEDED') {
        openUpgradeGate(
          'Límite de Viajes Alcanzado',
          err.message || 'Actualiza tu plan para crear más viajes.',
          err.data?.requiredPlan || 'pro'
        );
      } else {
        showToast(err.message || 'Error al guardar el viaje.', 'error');
      }
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!currentUser) return;
    try {
      await api.deleteTrip(tripId);
      setIsTripModalOpen(false);
      setEditingTrip(null);
      const remainingTrips = trips.filter(t => t.id !== tripId);
      setTrips(remainingTrips);
      const nextActiveId = remainingTrips.length > 0 ? remainingTrips[0].id : null;
      setActiveTripId(nextActiveId);
      if (nextActiveId) {
        const exp = await api.getExpenses(nextActiveId);
        setExpenses(exp);
      } else {
        setExpenses([]);
      }
      showToast('Viaje eliminado con éxito.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el viaje.', 'error');
    }
  };

  const handleUpdateTripMembers = async (newMembers: string[]) => {
    if (!currentUser || !activeTripId) return;
    const activeTrip = trips.find(t => t.id === activeTripId);
    if (!activeTrip) return;

    try {
      const updated = await api.saveTrip({ ...activeTrip, members: newMembers });
      setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar integrantes.', 'error');
    }
  };

  // Expense operations
  const handleSaveExpense = async (expenseData: Partial<Expense>): Promise<boolean> => {
    if (!currentUser || !activeTripId) return false;

    // Check if splitting expense on free plan
    const isSplitting = expenseData.splitBetween && expenseData.splitBetween.length > 1;
    if (isSplitting && (!subscription || !subscription.limits.canSplitExpenses)) {
      openUpgradeGate(
        'División de Gastos en Plan Pro / Premium',
        'La división de gastos entre viajeros requiere el Plan Pro o Premium. Actualiza tu plan para dividir gastos y liquidar saldos automáticamente.',
        'pro'
      );
      return false;
    }

    try {
      await api.saveExpense({
        ...expenseData,
        tripId: activeTripId,
      });
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      const updated = await api.getExpenses(activeTripId);
      setExpenses(updated);
      showToast(editingExpense ? 'Gasto actualizado.' : 'Gasto registrado correctamente.', 'success');
      return true;
    } catch (err: any) {
      if (err.data?.code === 'PLAN_LIMIT_EXCEEDED') {
        openUpgradeGate(
          'Función Requiere Actualización',
          err.message || 'Esta acción no está permitida en tu plan actual.',
          err.data?.requiredPlan || 'pro'
        );
      } else {
        showToast(err.message || 'Error al guardar el gasto.', 'error');
      }
      return false;
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentUser || !activeTripId) return;
    try {
      await api.deleteExpense(expenseId);
      const updated = await api.getExpenses(activeTripId);
      setExpenses(updated);
      showToast('Gasto eliminado.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el gasto.', 'error');
    }
  };

  // Update Trip Plans / Budgets
  const handleUpdatePlans = async (plans: PlanItem[]) => {
    if (!currentUser || !activeTripId) return;
    const activeTrip = trips.find(t => t.id === activeTripId);
    if (!activeTrip) return;

    try {
      const updated = await api.saveTrip({ ...activeTrip, plans });
      setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar planes.', 'error');
    }
  };

  // Update Checklist
  const handleUpdateChecklist = async (checklist: ChecklistItem[]) => {
    if (!currentUser || !activeTripId) return;
    const activeTrip = trips.find(t => t.id === activeTripId);
    if (!activeTrip) return;

    try {
      const updated = await api.saveTrip({ ...activeTrip, checklist });
      setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar lista de verificación.', 'error');
    }
  };

  // Update User Base Currency
  const handleUpdateBaseCurrency = async (newCurrency: CurrencyCode) => {
    if (!currentUser) return;
    try {
      const updated = await api.updateMe({ homeCurrency: newCurrency });
      setCurrentUser(updated);
      showToast(`Moneda base actualizada a ${newCurrency}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar moneda.', 'error');
    }
  };

  // Exports
  const handleExportCSV = () => {
    if (!subscription?.limits.canExportReports) {
      openUpgradeGate('Exportación de reportes', 'La exportación de reportes está disponible en los planes Pro y Premium.', 'pro');
      return;
    }
    if (!currentUser || !activeTripId) return;
    const activeTrip = trips.find(t => t.id === activeTripId);
    if (!activeTrip) return;

    const headers = ['ID', 'Fecha', 'Concepto', 'Categoría', 'Pagador', 'Dividido Entre', 'Monto Original', 'Moneda Original', `Monto en ${currentUser.homeCurrency}`, 'Notas'];
    const rows = expenses.map(e => {
      const homeAmount = convertToHomeCurrency(e.amount, e.currency, activeTrip, currentUser.homeCurrency);
      return [
        `"${e.id}"`,
        `"${e.date}"`,
        `"${(e.title || '').replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${e.paidBy}"`,
        `"${(e.splitBetween || []).join('; ')}"`,
        e.amount,
        `"${e.currency}"`,
        homeAmount.toFixed(2),
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rumbio_${activeTrip.name.replace(/\s+/g, '_')}_gastos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV descargado con éxito.', 'success');
  };

  const handleExportAllJSON = () => {
    if (!subscription?.limits.canExportReports) {
      openUpgradeGate('Exportación de reportes', 'La exportación de reportes está disponible en los planes Pro y Premium.', 'pro');
      return;
    }
    if (!currentUser) return;
    try {
      downloadStructuredJSON(currentUser, trips, expenses);
      showToast('Copia de respaldo JSON estructurada (v2.1) descargada con éxito.', 'success');
    } catch (err) {
      console.error('Error generating structured JSON:', err);
      showToast('Error al exportar datos JSON.', 'error');
    }
  };

  // Active Trip object
  const activeTrip = trips.find(t => t.id === activeTripId) || null;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Iniciando Rumbio...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notifications Overlay */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Not Logged In -> Auth View */}
      {!currentUser ? (
        <AuthView
          onLoginSuccess={handleLoginSuccess}
          onShowToast={showToast}
          onOpenLegal={(tab) => setLegalModalTab(tab)}
        />
      ) : (
        /* Logged In -> Main Application View */
        <div className="flex-1 flex flex-col">
          {/* Main Top Navigation */}
          <Navbar
            currentUser={currentUser}
            trips={trips}
            activeTripId={activeTripId}
            currentConcept={logoConcept}
            userPlan={subscription?.plan || 'free'}
            onSelectTrip={(tripId) => {
              setActiveTripId(tripId);
            }}
            onOpenNewTripModal={() => {
              setEditingTrip(null);
              setIsTripModalOpen(true);
            }}
            onOpenBrandModal={() => setIsBrandModalOpen(true)}
            onOpenPlans={() => setCurrentTab('plans')}
            onOpenGuide={() => setIsOnboardingOpen(true)}
            onLogout={handleLogout}
            onTriggerSecret={(msg) => showToast(msg, 'success')}
          />

          {/* Offline Sync Banner (Pro feature + offline status) */}
          <OfflineSyncBanner
            subscription={subscription}
            onOpenUpgradeGate={openUpgradeGate}
            onShowToast={showToast}
            onSyncComplete={async () => {
              await loadUserTrips(activeTripId);
            }}
          />

          {/* Sub-Navigation Tabs */}
          <TabsNav
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            expenseCount={expenses.length}
            pendingChecklistCount={
              activeTrip?.checklist ? activeTrip.checklist.filter(c => !c.isCompleted).length : 0
            }
            userPlan={subscription?.plan || 'free'}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentTab === 'plans' ? (
              <PlansView
                currentUser={currentUser}
                subscription={subscription}
                onRefreshSubscription={async (updatedSub?: UserSubscription) => {
                  if (updatedSub) {
                    setSubscription(updatedSub);
                  }
                  return await fetchSubscription();
                }}
                onTriggerToast={showToast}
                onOpenLegal={(tab) => setLegalModalTab(tab)}
                onNavigateToProfile={() => setCurrentTab('profile')}
              />
            ) : currentTab === 'profile' ? (
              <ProfileView
                currentUser={currentUser}
                userSubscription={subscription}
                onOpenPlans={() => setCurrentTab('plans')}
                onRefreshSubscription={async (updatedSub) => {
                  if (updatedSub) {
                    setSubscription(updatedSub);
                  }
                  return await fetchSubscription();
                }}
                onUpdateBaseCurrency={handleUpdateBaseCurrency}
                onExportAllJSON={handleExportAllJSON}
                onOpenExportModal={() => {
                       if (subscription?.limits.canExportReports) {
                         setIsExportModalOpen(true);
                       } else {
                         openUpgradeGate('Exportación de reportes', 'La exportación de reportes está disponible en los planes Pro y Premium.', 'pro');
                       }
                     }}
                onOpenLegal={(tab) => setLegalModalTab(tab)}
                onShowToast={showToast}
              />
            ) : currentTab === 'chat' ? (
              <ChatView
                currentUser={currentUser}
                subscription={subscription}
                trips={trips}
                activeTrip={activeTrip}
                expenses={expenses}
                onOpenPlans={() => setCurrentTab('plans')}
                onShowToast={showToast}
                onOpenUpgradeGate={openUpgradeGate}
              />
            ) : !activeTrip ? (
              /* Empty state if user has no trips */
              <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 my-12 max-w-lg mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-3xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/30">
                  <Compass className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">¡Comienza tu primera aventura!</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Crea un viaje definiendo destino, fechas, presupuesto y moneda local para llevar un control financiero impecable.
                </p>
                <button
                  onClick={() => {
                    setEditingTrip(null);
                    setIsTripModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-xl shadow-sky-600/25 transition active:scale-95 flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Crear Mi Primer Viaje</span>
                </button>
              </div>
            ) : (
              /* Render active tab */
              <>
                {currentTab === 'overview' && (
                  <OverviewView
                    trip={activeTrip}
                    expenses={expenses}
                    currentUser={currentUser}
                    subscription={subscription}
                    onOpenExpenseModal={() => {
                      setEditingExpense(null);
                      setIsExpenseModalOpen(true);
                    }}
                    onOpenQuickExpenseModal={() => {
                      setIsQuickExpenseOpen(true);
                    }}
                    onOpenEditTripModal={() => {
                      setEditingTrip(activeTrip);
                      setIsTripModalOpen(true);
                    }}
                    onNavigateToExpenses={() => setCurrentTab('expenses')}
                    onEditExpense={(exp) => {
                      setEditingExpense(exp);
                      setIsExpenseModalOpen(true);
                    }}
                    onExportCSV={handleExportCSV}
                    onOpenExportModal={() => {
                       if (subscription?.limits.canExportReports) {
                         setIsExportModalOpen(true);
                       } else {
                         openUpgradeGate('Exportación de reportes', 'La exportación de reportes está disponible en los planes Pro y Premium.', 'pro');
                       }
                     }}
                    onOpenBankSyncModal={() => setIsBankSyncModalOpen(true)}
                    onOpenBusinessTripModal={() => setIsBusinessTripModalOpen(true)}
                    onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
                    onOpenUpgradeGate={openUpgradeGate}
                    onShowToast={showToast}
                  />
                )}

                {currentTab === 'expenses' && (
                  <ExpensesView
                    trip={activeTrip}
                    expenses={expenses}
                    currentUser={currentUser}
                    onOpenAddModal={() => {
                      setEditingExpense(null);
                      setIsExpenseModalOpen(true);
                    }}
                    onOpenQuickModal={() => {
                      setIsQuickExpenseOpen(true);
                    }}
                    onEditExpense={(exp) => {
                      setEditingExpense(exp);
                      setIsExpenseModalOpen(true);
                    }}
                    onDeleteExpense={handleDeleteExpense}
                    onTriggerSecret={(msg) => showToast(msg, 'success')}
                    onOpenExportModal={() => {
                       if (subscription?.limits.canExportReports) {
                         setIsExportModalOpen(true);
                       } else {
                         openUpgradeGate('Exportación de reportes', 'La exportación de reportes está disponible en los planes Pro y Premium.', 'pro');
                       }
                     }}
                  />
                )}

                {currentTab === 'budget' && (
                  <BudgetView
                    trip={activeTrip}
                    expenses={expenses}
                    currentUser={currentUser}
                    subscription={subscription}
                    onUpdateTripPlans={handleUpdatePlans}
                    onShowToast={showToast}
                    onOpenUpgradeGate={openUpgradeGate}
                  />
                )}

                {currentTab === 'split' && (
                  <SplitView
                    trip={activeTrip}
                    expenses={expenses}
                    currentUser={currentUser}
                    userSubscription={subscription}
                    onOpenPlans={() => setCurrentTab('plans')}
                    onUpdateTripMembers={handleUpdateTripMembers}
                    onOpenExpenseModal={() => {
                      setEditingExpense(null);
                      setIsExpenseModalOpen(true);
                    }}
                    onShowToast={showToast}
                  />
                )}

                {currentTab === 'planner' && (
                  <PlannerView
                    trip={activeTrip}
                    expenses={expenses}
                    currentUser={currentUser}
                    onSavePlans={handleUpdatePlans}
                    onShowToast={showToast}
                  />
                )}

                {currentTab === 'checklist' && (
                  <ChecklistView
                    trip={activeTrip}
                    currentUser={currentUser}
                    onUpdateChecklist={handleUpdateChecklist}
                    onShowToast={showToast}
                  />
                )}

                {/* 404 Fallback if tab is unrecognized */}
                {!['overview', 'expenses', 'budget', 'split', 'planner', 'checklist', 'chat', 'plans', 'profile'].includes(currentTab) && (
                  <NotFoundView onGoHome={() => setCurrentTab('overview')} />
                )}
              </>
            )}
          </main>

          {/* App Footer with Legal & Contact Access */}
          <footer className="w-full border-t border-white/5 bg-[#050811]/90 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-white font-display">
                  Rumbio<span className="text-cyan-400">.</span>
                </span>
                <span className="text-slate-600">|</span>
                <span>Finanzas y Presupuesto de Viaje</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                <button
                  onClick={() => setLegalModalTab('privacy')}
                  className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
                >
                  Privacidad
                </button>
                <button
                  onClick={() => setLegalModalTab('terms')}
                  className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
                >
                  Términos
                </button>
                <button
                  onClick={() => setLegalModalTab('contact')}
                  className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
                >
                  Contacto ({'benchomateosa@gmail.com'})
                </button>
                <button
                  onClick={() => setLegalModalTab('cookies')}
                  className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
                >
                  Cookies
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Plan Gate Modal */}
      <PlanGateModal
        isOpen={isPlanGateOpen}
        onClose={() => setIsPlanGateOpen(false)}
        onSelectPlan={(plan) => {
          setIsPlanGateOpen(false);
          setCheckoutPlanModal(plan);
        }}
        requiredPlan={planGateInfo.requiredPlan || 'pro'}
        featureTitle={planGateInfo.title}
        featureDescription={planGateInfo.description}
      />

      {/* Direct Checkout Modal (Demo Mode Auto-Activation) */}
      {checkoutPlanModal && currentUser && (
        <CheckoutModal
          isOpen={!!checkoutPlanModal}
          onClose={() => setCheckoutPlanModal(null)}
          currentUser={currentUser}
          plan={checkoutPlanModal}
          billingCycle="monthly"
          onSuccess={async (newSub) => {
            if (newSub) {
              setSubscription(newSub);
            }
            await fetchSubscription();
          }}
          onShowToast={showToast}
        />
      )}

      {/* Trip Modal */}
      {isTripModalOpen && currentUser && (
        <TripModal
          trip={editingTrip}
          currentUser={currentUser}
          onSave={handleSaveTrip}
          onDelete={handleDeleteTrip}
          onClose={() => {
            setIsTripModalOpen(false);
            setEditingTrip(null);
          }}
        />
      )}

      {/* Expense Modal (Full detailed form) */}
      {isExpenseModalOpen && currentUser && activeTrip && (
        <ExpenseModal
          expense={editingExpense}
          trip={activeTrip}
          currentUser={currentUser}
          subscription={subscription}
          onSave={handleSaveExpense}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onTriggerSecret={(msg) => showToast(msg, 'success')}
          onOpenUpgradeGate={openUpgradeGate}
          onShowToast={showToast}
        />
      )}

      {/* Quick Expense Bottom Sheet (iOS-Style Fast 5-Step Entry) */}
      {isQuickExpenseOpen && currentUser && activeTrip && (
        <QuickExpenseModal
          isOpen={isQuickExpenseOpen}
          onClose={() => setIsQuickExpenseOpen(false)}
          trip={activeTrip}
          currentUser={currentUser}
          onSave={handleSaveExpense}
          onOpenFullForm={() => {
            setIsQuickExpenseOpen(false);
            setEditingExpense(null);
            setIsExpenseModalOpen(true);
          }}
          onShowToast={showToast}
        />
      )}

      {/* Floating Quick Expense Button (iOS-Style Fast Entry FAB) */}
      {currentUser && activeTrip && currentTab !== 'chat' && (
        <button
          id="floating-quick-expense-btn"
          type="button"
          onClick={() => setIsQuickExpenseOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:from-blue-500 hover:to-cyan-400 text-white font-black p-3.5 sm:px-5 sm:py-3 rounded-full shadow-2xl shadow-cyan-500/40 border border-cyan-300/40 flex items-center space-x-2.5 transition transform hover:scale-105 active:scale-95 group cursor-pointer"
          title="Registro Rápido de Gasto (Atajo Rumbio)"
          aria-label="Registrar gasto rápido"
        >
          <div className="w-7 h-7 rounded-full bg-slate-950/70 flex items-center justify-center border border-cyan-300/40 group-hover:rotate-90 transition-transform duration-300">
            <Plus className="w-4 h-4 text-cyan-300 stroke-[3]" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold tracking-wide font-display">
            + Gasto Rápido
          </span>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-950/70 text-emerald-300 border border-emerald-400/30 hidden sm:inline">
            10s
          </span>
        </button>
      )}

      {/* PWA Floating Compact Summary Widget (Pro Feature) */}
      {currentUser && activeTrip && currentTab !== 'chat' && (
        <PwaCompactWidget
          trip={activeTrip}
          expenses={expenses}
          currentUser={currentUser}
          subscription={subscription}
          onOpenAppTab={(tab) => setCurrentTab(tab)}
          onOpenUpgradeGate={openUpgradeGate}
        />
      )}

      {/* Onboarding Guide Modal */}
      {isOnboardingOpen && (
        <OnboardingModal onClose={() => setIsOnboardingOpen(false)} />
      )}

      {/* Brand Identity & Logo Showcase Modal */}
      {isBrandModalOpen && (
        <LogoBrandModal
          currentConcept={logoConcept}
          onSelectConcept={(newConcept) => {
            setLogoConcept(newConcept);
            localStorage.setItem('rumbio_logo_concept', newConcept);
          }}
          onClose={() => setIsBrandModalOpen(false)}
          onShowToast={showToast}
        />
      )}

      {/* Professional Export Modal (PDF with AI Summary, Structured JSON, CSV) */}
      {isExportModalOpen && currentUser && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          trips={trips}
          activeTripId={activeTripId}
          expenses={expenses}
          currentUser={currentUser}
          onShowToast={showToast}
        />
      )}

      {/* Open Banking Sync Modal (Premium Feature 1) */}
      {isBankSyncModalOpen && currentUser && activeTrip && (
        <BankSyncModal
          isOpen={isBankSyncModalOpen}
          onClose={() => setIsBankSyncModalOpen(false)}
          trip={activeTrip}
          currentUser={currentUser}
          subscription={subscription}
          onExpensesImported={async () => {
            if (activeTripId) {
              const exp = await api.getExpenses(activeTripId);
              setExpenses(exp);
            }
          }}
          onOpenPlans={() => openUpgradeGate('Sincronización Bancaria Automática', 'Conexión Open Banking para importar movimientos bancarios directamente.', 'premium')}
          onShowToast={showToast}
        />
      )}

      {/* Business Trip Mode & Corporate Metadata Modal (Premium Feature 4) */}
      {isBusinessTripModalOpen && currentUser && activeTrip && (
        <BusinessTripModal
          isOpen={isBusinessTripModalOpen}
          onClose={() => setIsBusinessTripModalOpen(false)}
          trip={activeTrip}
          expenses={expenses}
          currentUser={currentUser}
          subscription={subscription}
          onUpdateTripMetadata={async (metadata) => {
            const updated = await api.saveTrip({ ...activeTrip, isBusinessTrip: true, businessMetadata: metadata });
            setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            showToast('Metadatos corporativos del viaje guardados.', 'success');
          }}
          onOpenPlans={() => openUpgradeGate('Modo Viaje de Negocios', 'Rendición de cuentas corporativa y reportes con IVA/tax deductibles.', 'premium')}
          onShowToast={showToast}
        />
      )}

      {/* Cross-Trip Analytics & Budget Projection Modal (Premium Feature 3) */}
      {isAnalyticsModalOpen && currentUser && (
        <CrossTripAnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => setIsAnalyticsModalOpen(false)}
          trips={trips}
          allExpenses={expenses}
          currentUser={currentUser}
          subscription={subscription}
          onOpenPlans={() => openUpgradeGate('Reportes Comparativos & IA', 'Analítica transversal histórica y proyecciones de gasto futuro con IA.', 'premium')}
          onShowToast={showToast}
        />
      )}

      {/* Floating AI Assistant Copilot Widget */}
      {currentUser && currentTab !== 'chat' && (
        <AiChatFloatingWidget
          currentUser={currentUser}
          subscription={subscription}
          trips={trips}
          activeTrip={activeTrip}
          expenses={expenses}
          onOpenFullChat={() => setCurrentTab('chat')}
          onOpenUpgradeGate={openUpgradeGate}
          onShowToast={showToast}
        />
      )}

      {/* Legal & Trust Modal (Privacy, Terms, Contact, Cookies) */}
      <LegalModal
        isOpen={!!legalModalTab}
        initialTab={legalModalTab || 'privacy'}
        onClose={() => setLegalModalTab(null)}
        onShowToast={showToast}
      />

      {/* Non-intrusive Cookie & Storage Banner */}
      <CookieBanner onOpenLegal={(tab) => setLegalModalTab(tab)} />
    </div>
  );
}

export default App;
