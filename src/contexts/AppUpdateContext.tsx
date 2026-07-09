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
  APP_VERSION,
  APP_VERSION_LABEL,
  CURRENT_APP_VERSION,
} from '../lib/appVersion';
import { applyAppUpdateAndReload } from '../lib/pwaUpdate';
import {
  acknowledgeUpdateExtras,
  fetchAppUpdateStatus,
} from '../services/appUpdateService';

interface AppUpdateContextValue {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  clientVersion: string;
  clientVersionLabel: string;
  targetVersion: string | null;
  refreshNow: () => void;
  recheck: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [targetVersion, setTargetVersion] = useState<string | null>(null);
  const latestUpdateRef = useRef<Awaited<ReturnType<typeof fetchAppUpdateStatus>>['latestUpdate']>(null);
  const updatingRef = useRef(false);

  const recheck = useCallback(() => {
    if (!user || updatingRef.current) {
      if (!user) setVisible(false);
      return;
    }

    void fetchAppUpdateStatus(user.id).then((status) => {
      latestUpdateRef.current = status.latestUpdate;
      setTargetVersion(status.targetVersion);
      setVisible(status.visible);
      if (status.visible) {
        console.log('[Z&D Update] update available', {
          installed: status.installedVersion,
          current: CURRENT_APP_VERSION,
          target: status.targetVersion,
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
    const interval = window.setInterval(() => recheck(), 120_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [user, recheck]);

  const refreshNow = useCallback(() => {
    const versionToInstall = targetVersion ?? CURRENT_APP_VERSION;
    updatingRef.current = true;
    setVisible(false);
    void acknowledgeUpdateExtras(user?.id, latestUpdateRef.current);
    void applyAppUpdateAndReload(versionToInstall);
  }, [targetVersion, user?.id]);

  const value = useMemo<AppUpdateContextValue>(() => ({
    visible,
    title: APP_UPDATE_NOTIFICATION_TITLE,
    message: APP_UPDATE_NOTIFICATION_MESSAGE,
    buttonLabel: APP_UPDATE_BUTTON_LABEL,
    clientVersion: APP_VERSION,
    clientVersionLabel: targetVersion ? `v${targetVersion}` : APP_VERSION_LABEL,
    targetVersion,
    refreshNow,
    recheck,
  }), [visible, targetVersion, refreshNow, recheck]);

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
