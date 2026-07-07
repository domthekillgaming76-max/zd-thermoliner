import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { loadBankSettings, saveBankSettings, type BankSettings } from '../lib/bankSettings';
import {
  createManualTransaction,
  deleteTransaction,
  fetchEnterpriseBankBundle,
  syncValidatedRoadSheetsToBank,
  type ManualTransactionInput,
} from '../services/bankService';
import { createTransfer, type TransferInput } from '../services/bankTransferService';

export function useBankData() {
  const qc = useQueryClient();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.bank.data(),
    queryFn: async () => {
      try {
        const sync = await syncValidatedRoadSheetsToBank();
        if (sync.processed > 0) {
          console.log('[Z&D] Bank sync imported', sync.processed, 'validated road sheet(s)');
        }
      } catch (syncError) {
        console.error('[Z&D] bank sync error on Bank page load:', syncError);
      }

      const bundle = await fetchEnterpriseBankBundle(lastSyncAt);
      setLastSyncAt(bundle.lastSyncAt);
      return bundle;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('bank_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_bank_account' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_loans' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.bank.financing() });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [qc]);

  return query;
}

export function useBankSettings() {
  const [settings, setSettings] = useState<BankSettings>(loadBankSettings);

  const mutation = useMutation({
    mutationFn: async (next: BankSettings) => {
      saveBankSettings(next);
      return next;
    },
    onSuccess: next => setSettings(next),
  });

  return { settings, saveSettings: mutation.mutateAsync, saving: mutation.isPending };
}

export function useCreateTransaction(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: ManualTransactionInput) => {
      if (!userId) throw new Error('Vous devez être connecté.');
      return createManualTransaction(input, userId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    },
  });
}

export function useCreateTransfer(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<TransferInput, 'userId'>) => {
      if (!userId) throw new Error('Vous devez être connecté.');
      return createTransfer({ ...input, userId });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    },
  });
}

export function useDeleteTransaction(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    },
  });
}
