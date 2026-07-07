import type { Transaction, TransactionType } from './supabase';

export const CREDIT_TYPES: TransactionType[] = ['income', 'bonus', 'transfer'];

export const DEBIT_TYPES: TransactionType[] = [
  'expense',
  'fuel',
  'toll',
  'maintenance',
  'insurance',
  'salary',
  'rent',
  'tax',
  'penalty',
];

export const TRANSACTION_CATEGORIES = [
  'Revenue',
  'Fuel',
  'Toll',
  'Repair',
  'Insurance',
  'Salary',
  'Other',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: 'Revenue',
  expense: 'Other',
  fuel: 'Fuel',
  toll: 'Toll',
  maintenance: 'Repair',
  insurance: 'Insurance',
  salary: 'Salary',
  bonus: 'Prime',
  penalty: 'Pénalité',
  rent: 'Loyer',
  tax: 'Taxe',
  transfer: 'Virement',
};

export const TYPE_TO_CATEGORY: Record<string, TransactionCategory> = {
  income: 'Revenue',
  fuel: 'Fuel',
  toll: 'Toll',
  maintenance: 'Repair',
  insurance: 'Insurance',
  salary: 'Salary',
  expense: 'Other',
};

export function isCreditTransaction(tx: Pick<Transaction, 'type'> | string): boolean {
  const type = typeof tx === 'string' ? tx : tx.type;
  return CREDIT_TYPES.includes(type as TransactionType);
}

export function isDebitTransaction(tx: Pick<Transaction, 'type'> | string): boolean {
  const type = typeof tx === 'string' ? tx : tx.type;
  return DEBIT_TYPES.includes(type as TransactionType) || type === 'expense';
}

export function getTransactionTypeLabel(type: string, category?: string | null): string {
  if (category && TRANSACTION_CATEGORIES.includes(category as TransactionCategory)) {
    return category;
  }
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function sumCredits(transactions: Transaction[]): number {
  return transactions.filter(isCreditTransaction).reduce((s, t) => s + Number(t.amount), 0);
}

export function sumDebits(transactions: Transaction[]): number {
  return transactions.filter(isDebitTransaction).reduce((s, t) => s + Number(t.amount), 0);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
