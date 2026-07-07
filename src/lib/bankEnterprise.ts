import type { CompanyBankAccount, Transaction } from './supabase';
import { sumCredits, sumDebits } from './bankUtils';

export const BANK_BIC = 'ZDTFRPPXXX';
export const BANK_ACCOUNT_NUMBER = '00001234567';
export const BANK_NAME = 'Espace Banque Z&D Thermoliner';

export interface EnterpriseAccountView {
  companyName: string;
  availableBalance: number;
  accountingBalance: number;
  liveBalance: number;
  iban: string;
  bic: string;
  accountNumber: string;
  lastSynchronization: string | null;
}

export function deriveAccountingBalance(transactions: Transaction[]): number {
  const posted = transactions.filter(t => !t.status || t.status === 'posted');
  return sumCredits(posted) - sumDebits(posted);
}

export function buildEnterpriseAccountView(
  account: CompanyBankAccount | null,
  transactions: Transaction[],
  lastSyncAt: string | null,
): EnterpriseAccountView {
  const accountingBalance = deriveAccountingBalance(transactions);
  const storedBalance = account?.balance != null ? Number(account.balance) : accountingBalance;

  return {
    companyName: account?.account_name ?? 'Z&D Thermoliner',
    availableBalance: storedBalance,
    accountingBalance,
    liveBalance: storedBalance,
    iban: account?.iban_rp ?? 'FR76 3000 2999 0000 0000 0000 000',
    bic: BANK_BIC,
    accountNumber: BANK_ACCOUNT_NUMBER,
    lastSynchronization: lastSyncAt ?? account?.updated_at ?? null,
  };
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
