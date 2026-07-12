import { supabase, type CompanyBankAccount, type Transaction, type TransactionType } from '../lib/supabase';

import { isCreditTransaction, isDebitTransaction, TRANSACTION_CATEGORIES } from '../lib/bankUtils';

import {

  buildMonthChartFromTransactions,

  computeTransactionFinancials,

} from '../lib/transactionAnalytics';

import {

  fetchAllTransactions,

  fetchTransactionById,

  logSupabaseError,

} from '../lib/transactionSchema';

import { monthKey, todayKey } from '../lib/format';

import { buildEnterpriseAccountView } from '../lib/bankEnterprise';

import { buildTreasuryMetrics, summarizeAutoRoadSheetLines } from '../lib/bankTreasuryAnalytics';

import { buildBankNotifications } from '../lib/bankNotifications';

import { fetchFleetLoans, summarizeFleetFinancing } from './bankFinancingService';

import type { PeriodFilter, CategoryGroup } from '../components/bank/bankFilters';



export interface TransactionFilters {

  flow?: 'all' | 'income' | 'expense';

  type?: TransactionType | 'all';

  dateFrom?: string;

  dateTo?: string;

  category?: string;

  period?: PeriodFilter;

  categoryGroup?: CategoryGroup;

  search?: string;

}



export interface BankSummary {

  balance: number;

  monthlyIncome: number;

  monthlyExpenses: number;

  netProfit: number;

  netCashflow: number;

  pendingPayments: number;

  transactionCount: number;

}



export type { SyncResult } from './bankSyncService';

export { syncRoadSheetToBank, syncValidatedRoadSheetsToBank } from './bankSyncService';



export interface ManualTransactionInput {

  type: 'income' | 'expense';

  amount: number;

  description: string;

  category: string;

  date: string;

}



export const MANUAL_CATEGORIES = [...TRANSACTION_CATEGORIES] as const;



export async function fetchCompanyAccount(): Promise<CompanyBankAccount | null> {

  const { data, error } = await supabase

    .from('company_bank_account')

    .select('id,account_name,iban_rp,balance,updated_at')

    .limit(1)

    .maybeSingle();



  if (error) {

    logSupabaseError('fetchCompanyAccount', error);

    return null;

  }

  return (data as CompanyBankAccount) ?? null;

}



export async function fetchTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {

  let rows = await fetchAllTransactions({

    orderBy: 'date',

    ascending: false,

    dateFrom: filters.dateFrom,

    dateTo: filters.dateTo,

    category: filters.category,

  });



  if (filters.type && filters.type !== 'all') {

    rows = rows.filter(t => t.type === filters.type);

  } else if (filters.flow === 'income') {

    rows = rows.filter(isCreditTransaction);

  } else if (filters.flow === 'expense') {

    rows = rows.filter(isDebitTransaction);

  }



  return rows;

}



export async function fetchPendingRoadSheetCount(): Promise<number> {

  const { count, error } = await supabase

    .from('road_sheets')

    .select('id', { count: 'exact', head: true })

    .eq('validated', false);



  if (error) {

    logSupabaseError('fetchPendingRoadSheetCount', error);

    return 0;

  }

  return count ?? 0;

}



export function computeBankSummary(

  transactions: Transaction[],

  account: CompanyBankAccount | null,

  pendingPayments: number,

): BankSummary {

  const month = monthKey();

  const financials = computeTransactionFinancials(

    transactions,

    account?.balance != null ? Number(account.balance) : null,

    month,

    todayKey(),

  );



  return {

    balance: financials.balance,

    monthlyIncome: financials.monthlyIncome,

    monthlyExpenses: financials.monthlyExpenses,

    netProfit: financials.netProfit,

    netCashflow: financials.cashflow,

    pendingPayments,

    transactionCount: transactions.filter(t => !t.status || t.status === 'posted').length,

  };

}



export function buildMonthlyChartData(transactions: Transaction[]) {

  return buildMonthChartFromTransactions(transactions).map(m => ({

    month: m.month,

    income: m.income,

    expenses: m.expenses,

    net: m.profit,

  }));

}



export async function fetchEnterpriseBankBundle(lastSyncAt: string | null) {

  const [account, transactions, pendingPayments, loans] = await Promise.all([

    fetchCompanyAccount(),

    fetchTransactions(),

    fetchPendingRoadSheetCount(),

    fetchFleetLoans(),

  ]);



  const summary = computeBankSummary(transactions, account, pendingPayments);

  const chartData = buildMonthlyChartData(transactions);

  const accountView = buildEnterpriseAccountView(account, transactions, lastSyncAt);

  const treasury = buildTreasuryMetrics(transactions, summary.balance);

  const autoSync = summarizeAutoRoadSheetLines(transactions);

  const financing = summarizeFleetFinancing(loans);

  const notifications = buildBankNotifications(transactions, pendingPayments, loans);



  return {

    account,

    transactions,

    pendingPayments,

    summary,

    chartData,

    accountView,

    treasury,

    autoSync,

    financing,

    loans,

    notifications,

    lastSyncAt: lastSyncAt ?? new Date().toISOString(),

  };

}



export async function createManualTransaction(

  input: ManualTransactionInput,

  userId: string,

): Promise<Transaction> {

  const amount = Math.abs(input.amount);

  const { data: created, error } = await supabase.rpc('post_company_transaction', {
    p_type: input.type,
    p_amount: amount,
    p_description: input.description || (input.type === 'income' ? 'Encaissement manuel' : 'Décaissement manuel'),
    p_category: input.category || null,
    p_date: input.date.split('T')[0],
    p_user_id: userId,
    p_auto_generated: false,
    p_source: 'manual',
    p_metadata: { origin: 'bank_page' },
  });
  if (error) throw error;

  if (!created) throw new Error('Transaction créée mais introuvable.');



  return created as unknown as Transaction;

}



export async function deleteTransaction(id: string): Promise<void> {

  const tx = await fetchTransactionById(id);



  if (!tx) throw new Error('Transaction introuvable.');

  if (tx.auto_generated) throw new Error('Impossible de supprimer une transaction automatique.');



  const { error } = await supabase.rpc('delete_manual_company_transaction', {
    p_transaction_id: id,
  });

  if (error) throw error;



}


