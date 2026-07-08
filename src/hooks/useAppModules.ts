import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { APP_MODULES_SYNC_EVENT } from '../contexts/AppModulesContext';
import {
  createAppModule,
  fetchAppModules,
  swapModuleOrder,
  updateAppModule,
  type AppModuleInput,
} from '../services/appModuleService';

const MODULES_POLL_MS = 10_000;

export function useAppModulesQuery() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.appModules.all,
    queryFn: fetchAppModules,
    staleTime: 5_000,
    refetchInterval: MODULES_POLL_MS,
  });

  useEffect(() => {
    const channel = supabase
      .channel('app_modules_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_modules' }, () => {
        void qc.invalidateQueries({ queryKey: queryKeys.appModules.all });
        window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
      })
      .subscribe();

    const onSync = () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appModules.all });
    };
    window.addEventListener(APP_MODULES_SYNC_EVENT, onSync);

    return () => {
      channel.unsubscribe();
      window.removeEventListener(APP_MODULES_SYNC_EVENT, onSync);
    };
  }, [qc]);

  return query;
}

export function useUpdateAppModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AppModuleInput> }) =>
      updateAppModule(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appModules.all });
      window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
    },
  });
}

export function useSwapModuleOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idA, orderA, idB, orderB }: { idA: string; orderA: number; idB: string; orderB: number }) =>
      swapModuleOrder(idA, orderA, idB, orderB),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appModules.all });
      window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
    },
  });
}

export function useCreateAppModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AppModuleInput) => createAppModule(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appModules.all });
      window.dispatchEvent(new CustomEvent(APP_MODULES_SYNC_EVENT));
    },
  });
}
