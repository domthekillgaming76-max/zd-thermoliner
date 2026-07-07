import { isCreditTransaction, isDebitTransaction, TRANSACTION_CATEGORIES } from '../../lib/bankUtils';
import type { Transaction, TransactionType } from '../../lib/supabase';
import type { TransactionFilters } from '../../services/bankService';

export type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export type CategoryGroup =
  | 'all'
  | 'income'
  | 'expense'
  | 'fuel'
  | 'salary'
  | 'road_sheet'
  | 'maintenance'
  | 'transfer';

export const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

export const CATEGORY_GROUP_OPTIONS: { value: CategoryGroup; label: string }[] = [
  { value: 'all', label: 'Toutes catégories' },
  { value: 'income', label: 'Revenus' },
  { value: 'expense', label: 'Dépenses' },
  { value: 'fuel', label: 'Carburant' },
  { value: 'salary', label: 'Salaires' },
  { value: 'road_sheet', label: 'Feuille de route' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transfer', label: 'Virements' },
];

export function getPeriodRange(period: PeriodFilter): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];

  if (period === 'all') return { dateFrom: '', dateTo: '' };
  if (period === 'today') return { dateFrom: to, dateTo: to };

  const from = new Date(now);
  if (period === 'week') from.setDate(from.getDate() - 7);
  if (period === 'month') from.setMonth(from.getMonth() - 1);
  if (period === 'year') from.setFullYear(from.getFullYear() - 1);

  return { dateFrom: from.toISOString().split('T')[0], dateTo: to };
}

export function matchesCategoryGroup(tx: Transaction, group: CategoryGroup): boolean {
  if (group === 'all') return true;
  if (group === 'income') return isCreditTransaction(tx);
  if (group === 'expense') return isDebitTransaction(tx) && tx.type === 'expense';
  if (group === 'fuel') return tx.type === 'fuel';
  if (group === 'salary') return tx.type === 'salary';
  if (group === 'maintenance') return tx.type === 'maintenance';
  if (group === 'transfer') return tx.type === 'transfer';
  if (group === 'road_sheet') return tx.auto_generated === true || !!tx.road_sheet_id;
  return true;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  let rows = [...transactions];

  if (filters.period && filters.period !== 'all') {
    const { dateFrom, dateTo } = getPeriodRange(filters.period);
    if (dateFrom) rows = rows.filter(t => t.date >= dateFrom);
    if (dateTo) rows = rows.filter(t => t.date <= dateTo);
  }

  if (filters.dateFrom) rows = rows.filter(t => t.date >= filters.dateFrom!);
  if (filters.dateTo) rows = rows.filter(t => t.date <= filters.dateTo!);

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      t =>
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.category ?? '').toLowerCase().includes(q) ||
        (t.reference ?? '').toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
    );
  }

  if (filters.categoryGroup && filters.categoryGroup !== 'all') {
    rows = rows.filter(t => matchesCategoryGroup(t, filters.categoryGroup!));
  }

  if (filters.category && filters.category !== 'all') {
    rows = rows.filter(t => t.category === filters.category);
  }

  if (filters.type && filters.type !== 'all') {
    rows = rows.filter(t => t.type === filters.type);
  } else if (filters.flow === 'income') {
    rows = rows.filter(isCreditTransaction);
  } else if (filters.flow === 'expense') {
    rows = rows.filter(isDebitTransaction);
  }

  return rows;
}

export const CATEGORY_GROUP_OPTIONS_EXPORT = CATEGORY_GROUP_OPTIONS;

export const CATEGORY_FILTER_OPTIONS = ['all', ...TRANSACTION_CATEGORIES] as const;

export const TRANSACTION_TYPE_OPTIONS: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'income', label: 'Revenu' },
  { value: 'fuel', label: 'Carburant' },
  { value: 'toll', label: 'Péage' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'salary', label: 'Salaire' },
  { value: 'transfer', label: 'Virement' },
  { value: 'expense', label: 'Autre' },
];

export const DEFAULT_FILTERS: TransactionFilters = {
  flow: 'all',
  type: 'all',
  category: 'all',
  categoryGroup: 'all',
  period: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
};

export function exportTransactionsCsv(transactions: Transaction[]): void {
  const rows = [
    ['Date', 'Type', 'Montant', 'Description', 'Catégorie', 'Référence', 'Auto', 'Solde après'],
    ...transactions.map(t => [
      t.date,
      t.type,
      String(t.amount),
      t.description ?? '',
      t.category ?? '',
      t.reference ?? '',
      t.auto_generated ? 'Oui' : 'Non',
      t.balance_after != null ? String(t.balance_after) : '',
    ]),
  ];
  const csv = rows.map(r => r.join(';')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export function exportTransactionsPdf(
  transactions: Transaction[],
  meta: { companyName: string; iban: string; period: string },
): void {
  const rows = transactions
    .map(
      t => `<tr>
        <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
        <td>${t.description ?? t.type}</td>
        <td>${t.category ?? ''}</td>
        <td style="text-align:right">${Number(t.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relevé Z&D Thermoliner</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#003D24}
      h1{font-size:20px;color:#006B3F}
      table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
      th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
      th{background:#e8f5ef;color:#006B3F}
    </style></head><body>
    <h1>Relevé de transactions — ${meta.companyName}</h1>
    <p>IBAN : ${meta.iban}<br>Période : ${meta.period}<br>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
    <table><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
