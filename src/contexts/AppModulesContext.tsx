import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useAppModulesQuery } from '../hooks/useAppModules';
import {
  canAccessConfiguredModule,
  isModuleEnabled,
  isRouteEnabled,
} from '../lib/moduleAccess';
import type { AppModuleRecord } from '../services/appModuleService';
import { DEFAULT_APP_MODULES } from '../lib/defaultAppModules';

export const APP_MODULES_SYNC_EVENT = 'zd:app-modules-updated';

interface AppModulesContextValue {
  modules: AppModuleRecord[];
  loading: boolean;
  canAccessModuleKey: (key: string) => boolean;
  isModuleEnabledKey: (key: string) => boolean;
  isRouteEnabledPath: (pathname: string) => boolean;
}

const AppModulesContext = createContext<AppModulesContextValue | undefined>(undefined);

function buildFallbackModules(): AppModuleRecord[] {
  const now = new Date().toISOString();
  return DEFAULT_APP_MODULES.map(m => ({
    ...m,
    id: `default-${m.key}`,
    created_at: now,
    updated_at: now,
  }));
}

export function AppModulesProvider({ children }: { children: ReactNode }) {
  const { role, normalizedRole, user, profile } = useAuth();
  const liveRole = role ?? profile?.role ?? normalizedRole;
  const email = user?.email ?? profile?.email ?? null;

  const { data: modules = buildFallbackModules(), isLoading } = useAppModulesQuery();

  const value = useMemo<AppModulesContextValue>(() => ({
    modules,
    loading: isLoading,
    canAccessModuleKey: (key: string) => canAccessConfiguredModule(liveRole, email, key, modules),
    isModuleEnabledKey: (key: string) => isModuleEnabled(key, modules),
    isRouteEnabledPath: (pathname: string) => isRouteEnabled(pathname, modules),
  }), [modules, isLoading, liveRole, email]);

  return (
    <AppModulesContext.Provider value={value}>
      {children}
    </AppModulesContext.Provider>
  );
}

export function useAppModules(): AppModulesContextValue {
  const ctx = useContext(AppModulesContext);
  if (!ctx) {
    const fallback = buildFallbackModules();
    return {
      modules: fallback,
      loading: false,
      canAccessModuleKey: () => true,
      isModuleEnabledKey: () => true,
      isRouteEnabledPath: () => true,
    };
  }
  return ctx;
}
