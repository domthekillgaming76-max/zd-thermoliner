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
  APP_UPDATE_DISMISS_LABEL,
  APP_UPDATE_NOTIFICATION_MESSAGE,
  APP_UPDATE_NOTIFICATION_TITLE,
  APP_VERSION,
  APP_VERSION_LABEL,
  checkForNewVersion,
} from '../lib/appVersion';
import { applyAppUpdateAndReload, dismissAppUpdateForNow } from '../lib/pwaUpdate';
import {
  acknowledgeUpdateExtras,
  fetchAppUpdateStatus,
} from '../services/appUpdateService';

interface AppUpdateContextValue {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  dismissLabel: string;
  clientVersion: string;
  clientVersionLabel: string;
  installedVersion: string | null;
  serverVersion: string | null;
  refreshNow: () => void;
  dismissLater: () => void;
  recheck: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const latestUpdateRef = useRef<Awaited<ReturnType<typeof fetchAppUpdateStatus>>['latestUpdate']>(null);
  const updatingRef = useRef(false);

  const recheck = useCallback(() => {
    if (!user || updatingRef.current) {
      if (!user) setVisible(false);
      return;
    }

    const localCheck = checkForNewVersion();
    if (!localCheck.hasUpdate) {
      setVisible(false);
      setInstalledVersion(localCheck.installedVersion || null);
      return;
    }

    void fetchAppUpdateStatus(user.id).then((status) => {
      latestUpdateRef.current = status.latestUpdate;
      setInstalledVersion(status.installedVersion || null);
      setServerVersion(status.serverVersion);
      setVisible(status.visible);
      if (status.visible) {
        console.log('[Z&D Update] update available', {
          installed: status.installedVersion,
          current: APP_VERSION,
          server: status.serverVersion,
        });
      }
    });
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
    updatingRef.current = true;
    setVisible(false);
    void acknowledgeUpdateExtras(user?.id, latestUpdateRef.current);
    void applyAppUpdateAndReload();
  }, [user?.id]);

  const dismissLater = useCallback(() => {
    dismissAppUpdateForNow();
    setVisible(false);
  }, []);

  const value = useMemo<AppUpdateContextValue>(() => ({
    visible,
    title: APP_UPDATE_NOTIFICATION_TITLE,
    message: APP_UPDATE_NOTIFICATION_MESSAGE,
    buttonLabel: APP_UPDATE_BUTTON_LABEL,
    dismissLabel: APP_UPDATE_DISMISS_LABEL,
    clientVersion: APP_VERSION,
    clientVersionLabel: APP_VERSION_LABEL,
    installedVersion,
    serverVersion,
    refreshNow,
    dismissLater,
    recheck,
  }), [visible, installedVersion, serverVersion, refreshNow, dismissLater, recheck]);

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
