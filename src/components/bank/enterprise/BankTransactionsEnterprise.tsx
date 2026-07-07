import { Search } from 'lucide-react';
import { BankTransactionTable } from '../BankTransactionTable';
import {
  CATEGORY_GROUP_OPTIONS,
  PERIOD_OPTIONS,
  type PeriodFilter,
  type CategoryGroup,
} from '../bankFilters';
import type { TransactionFilters } from '../../../services/bankService';
import type { Transaction } from '../../../lib/supabase';
import { BankGlassPanel } from './BankGlassPanel';

interface BankTransactionsEnterpriseProps {
  transactions: Transaction[];
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  loading?: boolean;
  deletingId?: string | null;
  onDelete?: (id: string) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

export function BankTransactionsEnterprise({
  transactions,
  filters,
  onChange,
  loading,
  deletingId,
  onDelete,
  onExportCsv,
  onExportPdf,
}: BankTransactionsEnterpriseProps) {
  function set<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-4">
      <BankGlassPanel className="p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h2 className="text-base font-bold text-white">
            Opérations
            <span className="text-white/35 font-normal text-sm ml-2">({transactions.length})</span>
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={onExportCsv} disabled={transactions.length === 0} className="bank-lounge-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40">
              Export CSV
            </button>
            <button type="button" onClick={onExportPdf} disabled={transactions.length === 0} className="bank-lounge-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40">
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => set('period', p.value as PeriodFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filters.period === p.value ? 'bank-nav-tab-active' : 'text-white/35 hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_GROUP_OPTIONS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => set('categoryGroup', c.value as CategoryGroup)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filters.categoryGroup === c.value ? 'bank-nav-tab-active' : 'text-white/35 hover:bg-white/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={filters.search ?? ''}
            onChange={e => set('search', e.target.value)}
            placeholder="Rechercher libellé, catégorie, référence..."
            className="erp-input w-full pl-10"
          />
        </div>
      </BankGlassPanel>

      <BankTransactionTable
        transactions={transactions}
        loading={loading}
        deletingId={deletingId}
        onDelete={onDelete}
      />
    </div>
  );
}
