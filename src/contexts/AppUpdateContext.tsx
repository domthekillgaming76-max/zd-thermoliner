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
  APP_VERSION,
  APP_VERSION_LABEL,
  buildUpdateTitle,
  REMOTE_VERSION_POLL_MS,
} from '../lib/appVersion';
import { applyAppUpdateAndReload, dismissAppUpdateForNow } from '../lib/pwaUpdate';
import {
  acknowledgeUpdateExtras,
  fetchAppUpdateStatus,
} from '../services/appUpdateService';
import { APP_UPDATE_READY_EVENT, isServiceWorkerUpdateReady } from '../services/updateService';

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
  remoteVersion: string | null;
  targetVersion: string | null;
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
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState<string | null>(null);
  const [title, setTitle] = useState('Mise à jour disponible');
  const latestUpdateRef = useRef<Awaited<ReturnType<typeof fetchAppUpdateStatus>>['latestUpdate']>(null);
  const updatingRef = useRef(false);

  const recheck = useCallback(() => {
    if (!user || updatingRef.current) {
      if (!user) setVisible(false);
      return;
    }

    void fetchAppUpdateStatus(user.id, isServiceWorkerUpdateReady()).then((status) => {
      latestUpdateRef.current = status.latestUpdate;
      setInstalledVersion(status.installedVersion || null);
      setServerVersion(status.serverVersion);
      setRemoteVersion(status.remoteVersion);
      setTargetVersion(status.targetVersion);
      setVisible(status.visible);
      setTitle(buildUpdateTitle(status.targetVersion));

      if (status.visible) {
        console.log('[Z&D Update] update available', {
          running: APP_VERSION,
          installed: status.installedVersion,
          remote: status.remoteVersion,
          target: status.targetVersion,
          swReady: status.swUpdateReady,
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
    const onSwReady = () => recheck();

    window.addEventListener('focus', onFocus);
    window.addEventListener(APP_UPDATE_READY_EVENT, onSwReady);

    const pollId = window.setInterval(recheck, REMOTE_VERSION_POLL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(APP_UPDATE_READY_EVENT, onSwReady);
      window.clearInterval(pollId);
    };
  }, [user, recheck]);

  const refreshNow = useCallback(() => {
    updatingRef.current = true;
    setVisible(false);
    void acknowledgeUpdateExtras(user?.id, latestUpdateRef.current);
    void applyAppUpdateAndReload(targetVersion ?? undefined);
  }, [user?.id, targetVersion]);

  const dismissLater = useCallback(() => {
    dismissAppUpdateForNow(targetVersion ?? APP_VERSION);
    setVisible(false);
  }, [targetVersion]);

  const value = useMemo<AppUpdateContextValue>(() => ({
    visible,
    title,
    message: APP_UPDATE_NOTIFICATION_MESSAGE,
    buttonLabel: APP_UPDATE_BUTTON_LABEL,
    dismissLabel: APP_UPDATE_DISMISS_LABEL,
    clientVersion: APP_VERSION,
    clientVersionLabel: APP_VERSION_LABEL,
    installedVersion,
    serverVersion,
    remoteVersion,
    targetVersion,
    refreshNow,
    dismissLater,
    recheck,
  }), [
    visible,
    title,
    installedVersion,
    serverVersion,
    remoteVersion,
    targetVersion,
    refreshNow,
    dismissLater,
    recheck,
  ]);

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
