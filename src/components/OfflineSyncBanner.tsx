import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  CloudOff,
  Sparkles
} from 'lucide-react';
import { 
  getPendingExpenses, 
  getPendingTrips, 
  syncOfflineQueueToServer, 
  SyncResult 
} from '../utils/offlineSync';
import { UserSubscription } from '../types';
import { hasTierAccess } from '../data/plans';

interface OfflineSyncBannerProps {
  subscription: UserSubscription | null;
  onOpenUpgradeGate: (title: string, desc: string) => void;
  onSyncComplete?: () => void;
  onShowToast: (msg: string, type: 'success' | 'warning' | 'info' | 'error') => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  subscription,
  onOpenUpgradeGate,
  onSyncComplete,
  onShowToast,
}) => {
  const isPro = hasTierAccess(subscription, 'pro');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const checkPending = () => {
    const expenses = getPendingExpenses();
    const trips = getPendingTrips();
    setPendingCount(expenses.length + trips.length);
  };

  useEffect(() => {
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      if (isPro) {
        triggerSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isPro]);

  const triggerSync = async () => {
    if (!isPro) {
      onOpenUpgradeGate(
        'Modo Sin Conexión & Sincronización Automática',
        'Guarda gastos mientras viajas en avión o sin roaming y sincronízalos automáticamente con la nube al recuperar conexión. Exclusivo de planes Pro y Premium.'
      );
      return;
    }

    if (!navigator.onLine) {
      onShowToast('Sigues sin conexión a internet. Los cambios se sincronizarán en cuanto te conectes.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncOfflineQueueToServer();
      setLastSyncResult(res);
      checkPending();

      if (res.success && res.syncedCount > 0) {
        onShowToast(`¡Sincronización completada! ${res.syncedCount} elementos guardados en la nube.`, 'success');
        onSyncComplete?.();
      }
    } catch (err: any) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no pending items, hide banner or keep as subtle dot
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2 text-xs text-white backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          {!isOnline ? (
            <div className="flex items-center space-x-2 text-amber-400">
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span className="font-semibold">Modo Sin Conexión Activo</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-cyan-400">
              <Wifi className="w-4 h-4" />
              <span className="font-semibold">Conexión Restablecida</span>
            </div>
          )}

          <span className="text-slate-400 hidden sm:inline">•</span>

          {pendingCount > 0 ? (
            <span className="text-slate-300">
              Hay <b className="text-cyan-300 font-mono">{pendingCount}</b> cambios guardados localmente pendientes de subir.
            </span>
          ) : (
            <span className="text-slate-400">Tus datos locales están listos para viajar.</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {pendingCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          )}

          {!isPro && (
            <button
              onClick={() =>
                onOpenUpgradeGate(
                  'Sincronización Automática Offline',
                  'Desbloquea sincronización prioritaria de tus datos guardados sin conexión con el Plan Pro.'
                )
              }
              className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full hover:bg-amber-900/40 transition font-bold"
            >
              Desbloquear con Pro
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
