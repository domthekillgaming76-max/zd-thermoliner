import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { isUpdateNotificationVisible, saveSeenAppVersion, UPDATE_REFRESH_MESSAGE } from '../lib/appVersion';
import {
  acknowledgeUpdateExtras,
  fetchAppUpdateStatus,
  type AppUpdateStatus,
} from '../services/appUpdateService';
import { supabase } from '../lib/supabase';

interface AppUpdateContextValue extends AppUpdateStatus {
  loading: boolean;
  message: string;
  dismiss: () => void;
  refreshNow: () => void;
  refresh: () => Promise<void>;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

function initialStatus(): AppUpdateStatus {
  return {
    visible: isUpdateNotificationVisible(),
    serverVersion: null,
    latestUpdate: null,
    clientVersion: '',
    clientVersionLabel: '',
  };
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<AppUpdateStatus>(initialStatus);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, visible: false }));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchAppUpdateStatus();
      setStatus(next);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`app_update_notify_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, () => refresh())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user, refresh]);

  const dismiss = useCallback(() => {
    saveSeenAppVersion();
    setStatus(prev => ({ ...prev, visible: false }));
    void acknowledgeUpdateExtras(profile?.id ?? user?.id, status.latestUpdate);
  }, [profile?.id, user?.id, status.latestUpdate]);

  const refreshNow = useCallback(() => {
    saveSeenAppVersion();
    window.location.reload();
  }, []);

  const value = useMemo<AppUpdateContextValue>(() => ({
    ...status,
    loading,
    message: UPDATE_REFRESH_MESSAGE,
    dismiss,
    refreshNow,
    refresh,
  }), [status, loading, dismiss, refreshNow, refresh]);

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
    </AppUpdateContext.Provider>
  );
}

export function useAppUpdateNotification(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) {
    throw new Error('useAppUpdateNotification must be used within AppUpdateProvider');
  }
  return ctx;
}

export function useAppUpdateBadge(): boolean {
  const ctx = useContext(AppUpdateContext);
  return !!ctx?.visible;
}
