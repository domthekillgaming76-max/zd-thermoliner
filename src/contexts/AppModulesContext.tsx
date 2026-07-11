import { createContext, useContext, useMemo, ReactNode } from 'react';

import { useAuth } from './AuthContext';
import { useRoomPermissionsQuery } from '../hooks/useRoomPermissions';
import { canAccessSalon, canAccessPath } from '../lib/accessService';
import { roomsToAppModules } from '../lib/roomAdapter';
import { DEFAULT_ROOM_PERMISSIONS } from '../lib/defaultRoomPermissions';
import type { AppModuleRecord } from '../services/appModuleService';
import type { RoomPermission } from '../lib/roomTypes';

export const APP_MODULES_SYNC_EVENT = 'zd:app-modules-updated';

interface AppModulesContextValue {
  modules: AppModuleRecord[];
  rooms: RoomPermission[];
  loading: boolean;
  canAccessModuleKey: (key: string) => boolean;
  isModuleEnabledKey: (key: string) => boolean;
  isRouteEnabledPath: (pathname: string) => boolean;
}

const AppModulesContext = createContext<AppModulesContextValue | undefined>(undefined);

function buildFallbackRooms(): RoomPermission[] {
  const now = new Date().toISOString();
  return DEFAULT_ROOM_PERMISSIONS.map((r, i) => ({
    ...r,
    id: `default-${r.room_key}`,
    sort_order: r.sort_order ?? i * 10,
    created_at: now,
    updated_at: now,
  }));
}

export function AppModulesProvider({ children }: { children: ReactNode }) {
  const { role, normalizedRole, user, profile } = useAuth();
  const liveRole = role ?? profile?.role ?? normalizedRole;
  const email = user?.email ?? profile?.email ?? null;

  const { data: rooms = buildFallbackRooms(), isLoading } = useRoomPermissionsQuery();
  const modules = useMemo(() => roomsToAppModules(rooms), [rooms]);

  const value = useMemo<AppModulesContextValue>(() => ({
    modules,
    rooms,
    loading: isLoading,
    canAccessModuleKey: (key: string) => canAccessSalon({
      role: liveRole,
      email,
      moduleOrPage: key,
      rooms,
      isActive: profile?.is_active,
      isSuspended: profile?.is_suspended,
    }),
    isModuleEnabledKey: (key: string) => {
      const room = rooms.find(r => r.room_key === key);
      if (!room) return true;
      return room.enabled;
    },
    isRouteEnabledPath: (pathname: string) => {
      const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
      const room = rooms.find(r => {
        const route = r.route.replace(/\/$/, '') || '/';
        return path === route || path.startsWith(`${route}/`);
      });
      if (room && !room.enabled) return false;
      return canAccessPath({
        role: liveRole,
        email,
        pathname,
        rooms,
        isActive: profile?.is_active,
        isSuspended: profile?.is_suspended,
      });
    },
  }), [modules, rooms, isLoading, liveRole, email, profile?.is_active, profile?.is_suspended]);

  return (
    <AppModulesContext.Provider value={value}>
      {children}
    </AppModulesContext.Provider>
  );
}

export function useAppModules(): AppModulesContextValue {
  const ctx = useContext(AppModulesContext);
  if (!ctx) {
    const fallbackRooms = buildFallbackRooms();
    const fallbackModules = roomsToAppModules(fallbackRooms);
    return {
      modules: fallbackModules,
      rooms: fallbackRooms,
      loading: false,
      canAccessModuleKey: () => true,
      isModuleEnabledKey: () => true,
      isRouteEnabledPath: () => true,
    };
  }
  return ctx;
}
