import { supabase, type CompanyBankAccount, type Transaction, type TransactionType } from '../lib/supabase';

import { isCreditTransaction, isDebitTransaction, TRANSACTION_CATEGORIES } from '../lib/bankUtils';

import {

  buildMonthChartFromTransactions,

  computeTransactionFinancials,

} from '../lib/transactionAnalytics';

import {

  fetchAllTransactions,

  fetchLatestTransactionForUser,

  fetchTransactionById,

  logSupabaseError,

} from '../lib/transactionSchema';

import { insertTransactionRow } from '../lib/transactionInsert';

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



async function adjustCompanyBalance(delta: number): Promise<void> {

  const account = await fetchCompanyAccount();

  if (!account) {

    await supabase.from('company_bank_account').insert({

      account_name: 'Z&D Thermoliner',

      iban_rp: 'FR76 3000 2999 0000 0000 0000 000',

      balance: delta,

    });

    return;

  }



  await supabase

    .from('company_bank_account')

    .update({

      balance: Number(account.balance) + delta,

      updated_at: new Date().toISOString(),

    })

    .eq('id', account.id);

}



export async function createManualTransaction(

  input: ManualTransactionInput,

  userId: string,

): Promise<Transaction> {

  const amount = Math.abs(input.amount);

  const signedDelta = input.type === 'income' ? amount : -amount;



  await insertTransactionRow({

    user_id: userId,

    type: input.type,

    amount,

    description: input.description || null,

    category: input.category || null,

    date: input.date.split('T')[0],

    created_by: userId,

    auto_generated: false,

  });



  await adjustCompanyBalance(signedDelta);



  const created = await fetchLatestTransactionForUser(userId);

  if (!created) throw new Error('Transaction créée mais introuvable.');



  return created;

}



export async function deleteTransaction(id: string): Promise<void> {

  const tx = await fetchTransactionById(id);



  if (!tx) throw new Error('Transaction introuvable.');

  if (tx.auto_generated) throw new Error('Impossible de supprimer une transaction automatique.');



  const amount = Number(tx.amount);

  const delta = isCreditTransaction(tx) ? -amount : amount;



  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) throw error;



  await adjustCompanyBalance(delta);

}


