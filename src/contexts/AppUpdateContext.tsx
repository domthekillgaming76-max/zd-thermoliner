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
import {
  APP_UPDATE_BUTTON_LABEL,
  APP_UPDATE_NOTIFICATION_MESSAGE,
  APP_UPDATE_NOTIFICATION_TITLE,
  APP_VERSION,
  APP_VERSION_LABEL,
  isUpdateNotificationVisible,
  saveSeenAppVersion,
} from '../lib/appVersion';
import { applyAppUpdateAndReload } from '../lib/pwaUpdate';

interface AppUpdateContextValue {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  clientVersion: string;
  clientVersionLabel: string;
  refreshNow: () => void;
  recheck: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);

  const recheck = useCallback(() => {
    const shouldShow = !!user && isUpdateNotificationVisible();
    setVisible(shouldShow);
    if (shouldShow) {
      console.log('[Z&D Update] showing banner', APP_VERSION);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    recheck();
  }, [authLoading, recheck]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => recheck();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, recheck]);

  const refreshNow = useCallback(() => {
    saveSeenAppVersion();
    setVisible(false);
    void applyAppUpdateAndReload();
  }, []);

  const value = useMemo<AppUpdateContextValue>(() => ({
    visible,
    title: APP_UPDATE_NOTIFICATION_TITLE,
    message: APP_UPDATE_NOTIFICATION_MESSAGE,
    buttonLabel: APP_UPDATE_BUTTON_LABEL,
    clientVersion: APP_VERSION,
    clientVersionLabel: APP_VERSION_LABEL,
    refreshNow,
    recheck,
  }), [visible, refreshNow, recheck]);

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
