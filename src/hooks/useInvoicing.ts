import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  createContract,
  createErpClient,
  createInvoice,
  createInvoiceFromMission,
  createInvoiceFromRoadSheet,
  fetchClientDetailBundle,
  fetchInvoicingModuleBundle,
  markInvoicePaid,
  updateErpClient,
  updateInvoiceStatus,
  type ClientFormInput,
  type InvoiceFormInput,
} from '../services/invoicingService';
import type { InvoiceStatus } from '../lib/clientTypes';

export function useInvoicingModule() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.invoicing.module(),
    queryFn: fetchInvoicingModuleBundle,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('invoicing_module_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.invoicing.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.invoicing.all });
        qc.invalidateQueries({ queryKey: queryKeys.bank.all });
        qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_contracts' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.invoicing.all });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [qc]);

  return query;
}

export function useClientDetail(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoicing.detail(clientId ?? ''),
    queryFn: () => fetchClientDetailBundle(clientId!),
    enabled: !!clientId,
  });
}

export function useCreateErpClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createErpClient,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoicing.all }),
  });
}

export function useUpdateErpClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientFormInput }) => updateErpClient(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoicing.all });
      qc.invalidateQueries({ queryKey: queryKeys.invoicing.detail(id) });
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoicing.all }),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, createdBy }: { input: InvoiceFormInput; createdBy?: string }) =>
      createInvoice(input, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoicing.all }),
  });
}

export function useCreateInvoiceFromRoadSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roadSheetId, createdBy }: { roadSheetId: string; createdBy?: string }) =>
      createInvoiceFromRoadSheet(roadSheetId, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoicing.all }),
  });
}

export function useCreateInvoiceFromMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, createdBy }: { missionId: string; createdBy?: string }) =>
      createInvoiceFromMission(missionId, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoicing.all }),
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, userId }: { invoiceId: string; userId: string }) =>
      markInvoicePaid(invoiceId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.invoicing.all });
      qc.invalidateQueries({ queryKey: queryKeys.bank.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) => updateInvoiceStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoicing.all }),
  });
}
