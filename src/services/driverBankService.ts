import { supabase } from '../lib/supabase';
import type { DriverProfile } from '../lib/driverTypes';
import type { CompanyCard } from '../lib/driverHrTypes';
import type {
  AdminDriverBankAccountRow,
  AdminTransferInput,
  AdminTransferResult,
  DriverBankAccount,
  DriverBankBundle,
  DriverBankTransaction,
  CompanyBankTransfer,
} from '../lib/driverBankTypes';
import { DRIVER_BANK_NAME } from '../lib/driverBankTypes';
import { mapPayslipFromRow } from './driverHrService';
import {
  notifyBankAccountActivated,
  notifyBankTransferReceived,
} from './notificationService';

function mapAccount(row: Record<string, unknown>): DriverBankAccount {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    driver_id: row.driver_id as string,
    account_number: row.account_number as string,
    rp_iban: row.rp_iban as string,
    bank_name: row.bank_name as string,
    holder_name: row.holder_name as string,
    holder_pseudo: (row.holder_pseudo as string) ?? null,
    holder_email: (row.holder_email as string) ?? null,
    balance: Number(row.balance ?? 0),
    status: row.status as DriverBankAccount['status'],
    opened_at: row.opened_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapTransaction(row: Record<string, unknown>): DriverBankTransaction {
  return {
    id: row.id as string,
    account_id: row.account_id as string,
    profile_id: row.profile_id as string,
    type: row.type as DriverBankTransaction['type'],
    direction: row.direction as DriverBankTransaction['direction'],
    amount: Number(row.amount ?? 0),
    balance_after: Number(row.balance_after ?? 0),
    label: row.label as string,
    reference: (row.reference as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
  };
}

function mapTransfer(row: Record<string, unknown>): CompanyBankTransfer {
  const accounts = row.driver_bank_accounts as { holder_name?: string } | { holder_name?: string }[] | null;
  const holder = Array.isArray(accounts) ? accounts[0]?.holder_name : accounts?.holder_name;
  return {
    id: row.id as string,
    company_account_id: (row.company_account_id as string) ?? null,
    target_profile_id: row.target_profile_id as string,
    target_driver_account_id: row.target_driver_account_id as string,
    type: row.type as CompanyBankTransfer['type'],
    amount: Number(row.amount ?? 0),
    reason: row.reason as string,
    reference: (row.reference as string) ?? null,
    admin_comment: (row.admin_comment as string) ?? null,
    status: row.status as CompanyBankTransfer['status'],
    company_transaction_id: (row.company_transaction_id as string) ?? null,
    driver_transaction_id: (row.driver_transaction_id as string) ?? null,
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    holder_name: holder,
  };
}

function mapCompanyCard(row: Record<string, unknown>): CompanyCard {
  return {
    id: row.id as string,
    driver_id: row.driver_id as string,
    profile_id: (row.profile_id as string) ?? null,
    bank_name: row.bank_name as string,
    holder_name: row.holder_name as string,
    masked_number: row.masked_number as string,
    status: row.status as CompanyCard['status'],
    spending_limit: Number(row.spending_limit ?? 0),
    issued_at: row.issued_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function ensureDriverBankAccount(
  driver: Pick<DriverProfile, 'id' | 'user_id' | 'name' | 'pseudo' | 'email'>,
  options?: { notify?: boolean },
): Promise<DriverBankAccount | null> {
  if (!driver.user_id) return null;

  const { data: existing } = await supabase
    .from('driver_bank_accounts')
    .select('*')
    .eq('driver_id', driver.id)
    .maybeSingle();

  if (existing) return mapAccount(existing as Record<string, unknown>);

  const { data: rpcId, error: rpcErr } = await supabase.rpc('ensure_driver_bank_account', {
    p_driver_id: driver.id,
    p_profile_id: driver.user_id,
  });

  if (!rpcErr && rpcId) {
    const { data } = await supabase.from('driver_bank_accounts').select('*').eq('id', rpcId).single();
    if (data) {
      const account = mapAccount(data as Record<string, unknown>);
      if (options?.notify !== false) {
        try { await notifyBankAccountActivated(driver.user_id); } catch { /* non-blocking */ }
      }
      return account;
    }
  }

  const suffix = driver.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const { data, error } = await supabase
    .from('driver_bank_accounts')
    .insert({
      profile_id: driver.user_id,
      driver_id: driver.id,
      account_number: `ZD-${suffix}`,
      rp_iban: `ZD76 2026 0000 ${suffix.slice(0, 4)} ${suffix.slice(4, 8)}`,
      bank_name: DRIVER_BANK_NAME,
      holder_name: driver.name,
      holder_pseudo: driver.pseudo,
      holder_email: driver.email,
      balance: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.warn('[Z&D Bank] ensureDriverBankAccount:', error.message);
    return null;
  }

  const account = mapAccount(data as Record<string, unknown>);
  if (options?.notify !== false) {
    try { await notifyBankAccountActivated(driver.user_id); } catch { /* non-blocking */ }
  }
  return account;
}

export async function fetchDriverBankAccount(profileId: string): Promise<DriverBankAccount | null> {
  const { data, error } = await supabase
    .from('driver_bank_accounts')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error || !data) return null;
  return mapAccount(data as Record<string, unknown>);
}

export async function fetchDriverBankTransactions(
  accountId: string,
  limit = 50,
): Promise<DriverBankTransaction[]> {
  const { data, error } = await supabase
    .from('driver_bank_transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(r => mapTransaction(r as Record<string, unknown>));
}

export async function fetchDriverBankBundle(profileId: string): Promise<DriverBankBundle> {
  const account = await fetchDriverBankAccount(profileId);
  if (!account) {
    return {
      account: null,
      transactions: [],
      payslips: [],
      companyCard: null,
      openingBalance: 0,
      closingBalance: 0,
    };
  }

  const [txRes, payslipRes, cardRes] = await Promise.all([
    fetchDriverBankTransactions(account.id, 80),
    supabase
      .from('driver_payslips')
      .select('*')
      .eq('profile_id', profileId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(24),
    supabase.from('company_cards').select('*').eq('driver_id', account.driver_id).maybeSingle(),
  ]);

  const transactions = txRes;
  const payslips = (payslipRes.data ?? []).map(r => mapPayslipFromRow(r as Record<string, unknown>));
  const companyCard = cardRes.data ? mapCompanyCard(cardRes.data as Record<string, unknown>) : null;

  const closingBalance = account.balance;
  const credits = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0);
  const debits = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
  const openingBalance = Math.round((closingBalance - credits + debits) * 100) / 100;

  return {
    account,
    transactions,
    payslips,
    companyCard,
    openingBalance,
    closingBalance,
  };
}

export async function fetchAllDriverBankAccounts(): Promise<AdminDriverBankAccountRow[]> {
  const { data, error } = await supabase
    .from('driver_bank_accounts')
    .select('*, drivers(name)')
    .order('holder_name');
  if (error) throw error;
  return (data ?? []).map(row => {
    const drivers = row.drivers as { name?: string } | { name?: string }[] | null;
    const driverName = Array.isArray(drivers) ? drivers[0]?.name : drivers?.name;
    return {
      ...mapAccount(row as Record<string, unknown>),
      driver_name: driverName,
    };
  });
}

export async function fetchCompanyBankTransfers(limit = 100): Promise<CompanyBankTransfer[]> {
  const { data, error } = await supabase
    .from('company_bank_transfers')
    .select('*, driver_bank_accounts(holder_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(r => mapTransfer(r as Record<string, unknown>));
}

export async function adminTransferToDriver(input: AdminTransferInput): Promise<AdminTransferResult> {
  const { data, error } = await supabase.rpc('admin_transfer_to_driver', {
    p_target_profile_id: input.targetProfileId,
    p_type: input.type,
    p_amount: input.amount,
    p_reason: input.reason,
    p_reference: input.reference ?? null,
    p_admin_comment: input.adminComment ?? null,
    p_salary_history_id: input.salaryHistoryId ?? null,
  });

  if (error) throw new Error(error.message);

  const result = data as AdminTransferResult;

  if (input.type !== 'sanction') {
    try {
      await notifyBankTransferReceived(
        input.targetProfileId,
        input.amount,
        input.reason,
      );
    } catch { /* non-blocking */ }
  }

  return result;
}

export async function resetDriverBankRpData(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('reset_driver_bank_rp_data');
  if (error) throw error;
  return (data as Record<string, number>) ?? {};
}
