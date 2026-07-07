import { Filter, RotateCcw } from 'lucide-react';
import type { TransactionFilters } from '../../services/bankService';
import { CATEGORY_FILTER_OPTIONS, DEFAULT_FILTERS, TRANSACTION_TYPE_OPTIONS } from './bankFilters';

interface BankTransactionFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  resultCount: number;
}

export function BankTransactionFilters({ filters, onChange, resultCount }: BankTransactionFiltersProps) {
  function set<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters =
    filters.flow !== 'all' ||
    filters.type !== 'all' ||
    (filters.category && filters.category !== 'all') ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  return (
    <div className="erp-card rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-white">Filtres transactions</h3>
          <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/5">
            {resultCount} résultat{resultCount !== 1 ? 's' : ''}
          </span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'income', 'expense'] as const).map(flow => (
          <button
            key={flow}
            type="button"
            onClick={() => set('flow', flow)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filters.flow === flow
                ? flow === 'income'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : flow === 'expense'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                    : 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent'
            }`}
          >
            {flow === 'all' ? 'Tout' : flow === 'income' ? 'Revenus' : 'Dépenses'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1.5">
            Type
          </label>
          <select
            value={filters.type ?? 'all'}
            onChange={e => set('type', e.target.value as TransactionFilters['type'])}
            className="erp-select w-full"
          >
            {TRANSACTION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1.5">
            Catégorie
          </label>
          <select
            value={filters.category ?? 'all'}
            onChange={e => set('category', e.target.value)}
            className="erp-select w-full"
          >
            <option value="all">Toutes</option>
            {CATEGORY_FILTER_OPTIONS.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1.5">
            Du
          </label>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={e => set('dateFrom', e.target.value)}
            className="erp-input w-full"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1.5">
            Au
          </label>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={e => set('dateTo', e.target.value)}
            className="erp-input w-full"
          />
        </div>
      </div>
    </div>
  );
}
