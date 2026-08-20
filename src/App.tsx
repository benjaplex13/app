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
import { Navbar } from './components/Navbar';
import { TabsNav } from './components/TabsNav';
import { TripModal } from './components/TripModal';
import { ExpenseModal } from './components/ExpenseModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ToastContainer } from './components/ToastContainer';
import { LogoBrandModal } from './components/LogoBrandModal';
import { PlanGateModal } from './components/PlanGateModal';
import { LogoConcept } from './components/RumbioLogo';
import { Compass, Plus, Loader2 } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  // Plan Gate Modal
  const [isPlanGateOpen, setIsPlanGateOpen] = useState(false);
  const [planGateInfo, setPlanGateInfo] = useState<{
    title?: string;
    description?: string;
    requiredPlan?: PlanTier;
  }>({});

  // Brand Concept
  const [logoConcept, setLogoConcept] = useState<LogoConcept>(() => {
    return (localStorage.getItem('rumbio_logo_concept') as LogoConcept) || 'growth-compass';
  });
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  // Modals
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

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
  const loadUserTrips = async (preserveActiveId?: string | null) => {
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
    } catch (err: any) {
      console.error('Error loading trips from API:', err);
    }
  };

  // Check existing session and payment return on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          await loadUserTrips();
          await fetchSubscription();

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
    if (currentUser && activeTripId) {
      api.getExpenses(activeTripId)
        .then((data) => setExpenses(data))
        .catch((err) => console.error('Error loading expenses:', err));
    }
  }, [activeTripId, currentUser]);

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadUserTrips();
    await fetchSubscription();
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

  const openUpgradeGate = (featureTitle: string, featureDescription: string, requiredPlan: PlanTier = 'pro') => {
    setPlanGateInfo({
      title: featureTitle,
      description: featureDescription,
      requiredPlan,
    });
    setIsPlanGateOpen(true);
  };

  // Trip operations
  const handleSaveTrip = async (tripData: Partial<Trip>) => {
    if (!currentUser) return;

    // Check client-side plan limits for new trips
    if (!editingTrip && trips.length >= (subscription?.limits.maxActiveTrips ?? 1)) {
      openUpgradeGate(
        'Límite de 1 viaje en el Plan Gratis',
        'Has alcanzado el límite de 1 viaje activo a la vez del plan Gratis. Actualiza a Pro o Premium para crear viajes ilimitados.',
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
  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    if (!currentUser || !activeTripId) return;

    // Check if splitting expense on free plan
    const isSplitting = expenseData.splitBetween && expenseData.splitBetween.length > 1;
    if (isSplitting && subscription && !subscription.limits.canSplitExpenses) {
      openUpgradeGate(
        'División de Gastos en Plan Pro / Premium',
        'La división de gastos entre viajeros requiere el Plan Pro o Premium. Actualiza tu plan para dividir gastos y liquidar saldos automáticamente.',
        'pro'
      );
      return;
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
    if (!currentUser) return;
    const payload = {
      user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, homeCurrency: currentUser.homeCurrency },
      exportedAt: new Date().toISOString(),
      trips,
      expenses,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rumbio_respaldo_${currentUser.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Copia de respaldo JSON descargada con éxito.', 'success');
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
                onRefreshSubscription={fetchSubscription}
                onTriggerToast={showToast}
              />
            ) : currentTab === 'profile' ? (
              <ProfileView
                currentUser={currentUser}
                userSubscription={subscription}
                onOpenPlans={() => setCurrentTab('plans')}
                onUpdateBaseCurrency={handleUpdateBaseCurrency}
                onExportAllJSON={handleExportAllJSON}
                onShowToast={showToast}
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
                    onOpenExpenseModal={() => {
                      setEditingExpense(null);
                      setIsExpenseModalOpen(true);
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
                    onEditExpense={(exp) => {
                      setEditingExpense(exp);
                      setIsExpenseModalOpen(true);
                    }}
                    onDeleteExpense={handleDeleteExpense}
                    onTriggerSecret={(msg) => showToast(msg, 'success')}
                  />
                )}

                {currentTab === 'budget' && (
                  <BudgetView
                    trip={activeTrip}
                    expenses={expenses}
                    currentUser={currentUser}
                    onUpdateTripPlans={handleUpdatePlans}
                    onShowToast={showToast}
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
              </>
            )}
          </main>
        </div>
      )}

      {/* Plan Gate Modal */}
      <PlanGateModal
        isOpen={isPlanGateOpen}
        onClose={() => setIsPlanGateOpen(false)}
        onSelectPlan={(plan) => {
          setIsPlanGateOpen(false);
          setCurrentTab('plans');
        }}
        requiredPlan={planGateInfo.requiredPlan || 'pro'}
        featureTitle={planGateInfo.title}
        featureDescription={planGateInfo.description}
      />

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

      {/* Expense Modal */}
      {isExpenseModalOpen && currentUser && activeTrip && (
        <ExpenseModal
          expense={editingExpense}
          trip={activeTrip}
          currentUser={currentUser}
          onSave={handleSaveExpense}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onTriggerSecret={(msg) => showToast(msg, 'success')}
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
    </div>
  );
}

export default App;
