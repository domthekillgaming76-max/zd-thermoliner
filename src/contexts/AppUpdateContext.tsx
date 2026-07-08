import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  APP_UPDATE_BUTTON_LABEL,
  APP_UPDATE_NOTIFICATION_MESSAGE,
  APP_UPDATE_NOTIFICATION_TITLE,
  APP_VERSION_LABEL,
  isUpdateNotificationVisible,
} from '../lib/appVersion';
import { applyAppUpdateAndReload } from '../lib/pwaUpdate';
import {
  acknowledgeUpdateExtras,
  fetchAppUpdateStatus,
  type AppUpdateStatus,
} from '../services/appUpdateService';
import { supabase } from '../lib/supabase';

const UPDATE_POLL_MS = 30_000;

interface AppUpdateContextValue extends AppUpdateStatus {
  loading: boolean;
  title: string;
  message: string;
  buttonLabel: string;
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
    clientVersionLabel: APP_VERSION_LABEL,
  };
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<AppUpdateStatus>(initialStatus);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, visible: false }));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchAppUpdateStatus(user.id);
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
    if (!user?.id) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (isUpdateNotificationVisible()) {
        void refresh();
      }
    }, UPDATE_POLL_MS);

    const channel = supabase
      .channel(`app_update_notify_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, () => refresh())
      .subscribe();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  const refreshNow = useCallback(() => {
    void acknowledgeUpdateExtras(profile?.id ?? user?.id, status.latestUpdate);
    void applyAppUpdateAndReload();
  }, [profile?.id, user?.id, status.latestUpdate]);

  const value = useMemo<AppUpdateContextValue>(() => ({
    ...status,
    loading,
    title: APP_UPDATE_NOTIFICATION_TITLE,
    message: APP_UPDATE_NOTIFICATION_MESSAGE,
    buttonLabel: APP_UPDATE_BUTTON_LABEL,
    refreshNow,
    refresh,
  }), [status, loading, refreshNow, refresh]);

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
