import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { APP_MODULES_SYNC_EVENT } from '../contexts/AppModulesContext';
import { PERF } from '../lib/perfConfig';
import {
  batchUpdateRoomOrder,
  fetchRoomPermissions,
  updateRoomPermission,
} from '../services/roomPermissionService';
import type { RoomPermissionPatch } from '../lib/roomTypes';

const ROOMS_POLL_MS = PERF.modulesPollMs;

export function useRoomPermissionsQuery() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.roomPermissions.all,
    queryFn: fetchRoomPermissions,
    staleTime: 5_000,
    refetchInterval: ROOMS_POLL_MS,
  });

  useEffect(() => {
    const channel = supabase
      .channel('room_permissions_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_permissions' }, () => {
        void qc.invalidateQueries({ queryKey: queryKeys.roomPermissions.all });
        window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
      })
      .subscribe();

    const onSync = () => {
      void qc.invalidateQueries({ queryKey: queryKeys.roomPermissions.all });
    };
    window.addEventListener(APP_MODULES_SYNC_EVENT, onSync);

    return () => {
      channel.unsubscribe();
      window.removeEventListener(APP_MODULES_SYNC_EVENT, onSync);
    };
  }, [qc]);

  return query;
}

export function useUpdateRoomPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RoomPermissionPatch }) =>
      updateRoomPermission(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.roomPermissions.all });
      window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
    },
  });
}

export function useBatchUpdateRoomOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; sort_order: number; category?: string }>) =>
      batchUpdateRoomOrder(updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.roomPermissions.all });
      window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
    },
  });
}
