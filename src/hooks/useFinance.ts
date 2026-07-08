import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  accountingToCsv,
  fetchAccountingExport,
  fetchDriverSalaries,
  fetchFinanceBundle,
  fetchFinanceInvoices,
  fetchFinanceSettings,
  payDriverSalary,
  updateFinanceSettings,
} from '../services/financeService';
import { markInvoicePaid, updateInvoiceStatus } from '../services/invoicingService';
import type { FinanceSettings } from '../lib/financeTypes';
import type { InvoiceStatus } from '../lib/clientTypes';

export function useFinanceModule() {
  return useQuery({
    queryKey: queryKeys.finance.module(),
    queryFn: fetchFinanceBundle,
    staleTime: 30_000,
  });
}

export function useFinanceInvoices() {
  return useQuery({
    queryKey: queryKeys.finance.invoices(),
    queryFn: fetchFinanceInvoices,
    staleTime: 30_000,
  });
}

export function useDriverSalaries(driverId?: string) {
  return useQuery({
    queryKey: queryKeys.finance.salaries(driverId),
    queryFn: () => fetchDriverSalaries(driverId),
    staleTime: 30_000,
  });
}

export function useFinanceSettings() {
  return useQuery({
    queryKey: queryKeys.finance.settings(),
    queryFn: fetchFinanceSettings,
  });
}

export function usePayDriverSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ salaryId, userId }: { salaryId: string; userId: string }) =>
      payDriverSalary(salaryId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.all });
      qc.invalidateQueries({ queryKey: queryKeys.bank.all });
    },
  });
}

export function useMarkFinanceInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, userId }: { invoiceId: string; userId: string }) =>
      markInvoicePaid(invoiceId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.all });
      qc.invalidateQueries({ queryKey: queryKeys.invoicing.all });
      qc.invalidateQueries({ queryKey: queryKeys.bank.all });
    },
  });
}

export function useUpdateFinanceInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.finance.all }),
  });
}

export function useUpdateFinanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, userId }: { input: Partial<FinanceSettings>; userId: string }) =>
      updateFinanceSettings(input, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.finance.all }),
  });
}

export function useAccountingExport() {
  return useQuery({
    queryKey: queryKeys.finance.accounting(),
    queryFn: fetchAccountingExport,
    enabled: false,
  });
}

export async function downloadAccountingCsv(): Promise<void> {
  const rows = await fetchAccountingExport();
  const csv = accountingToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zd-comptabilite-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
