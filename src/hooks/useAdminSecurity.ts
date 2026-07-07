import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  changeUserRole,
  deleteUserProfile,
  fetchAdminModuleBundle,
  fetchUserActivity,
  fetchUserPermissions,
  reactivateUser,
  resetUserTheme,
  suspendUser,
  upsertUserPermission,
} from '../services/adminService';
import type { PermissionKey } from '../lib/adminTypes';

export function useAdminModule() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.admin.module(),
    queryFn: fetchAdminModuleBundle,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('admin_module_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_logs' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_actions' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [qc]);

  return query;
}

export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.permissions(userId ?? ''),
    queryFn: () => fetchUserPermissions(userId!),
    enabled: !!userId,
  });
}

export function useUserActivity(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.activity(userId ?? ''),
    queryFn: () => fetchUserActivity(userId!),
    enabled: !!userId,
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role, email }: { userId: string; role: string; email: string }) =>
      changeUserRole(userId, role, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, email, reason }: { userId: string; email: string; reason?: string }) =>
      suspendUser(userId, email, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => reactivateUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

export function useResetUserTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, email }: { userId: string; email: string }) => resetUserTheme(userId, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

export function useDeleteUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, email, reason }: { userId: string; email: string; reason?: string }) =>
      deleteUserProfile(userId, email, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

export function useUpsertPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, key, granted, grantedBy, email }: {
      userId: string; key: PermissionKey; granted: boolean; grantedBy: string; email: string;
    }) => upsertUserPermission(userId, key, granted, grantedBy, email),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      qc.invalidateQueries({ queryKey: queryKeys.admin.permissions(userId) });
    },
  });
}
