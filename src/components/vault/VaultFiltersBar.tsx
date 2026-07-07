import { useMemo } from 'react';
import { Search } from 'lucide-react';
import type { VaultCategory, VaultDocumentStatus, VaultOwnerType } from '../../lib/vaultTypes';
import { VAULT_OWNER_LABELS, VAULT_STATUS_LABELS } from '../../lib/vaultTypes';

export interface VaultFilters {
  search: string;
  categoryKey: string;
  status: 'all' | VaultDocumentStatus;
  ownerType: 'all' | VaultOwnerType;
}

interface VaultFiltersBarProps {
  filters: VaultFilters;
  categories: VaultCategory[];
  onChange: (filters: VaultFilters) => void;
}

export function VaultFiltersBar({ filters, categories, onChange }: VaultFiltersBarProps) {
  const categoryOptions = useMemo(
    () => [{ key: 'all', label: 'Toutes catégories' }, ...categories.map(c => ({ key: c.key, label: c.label }))],
    [categories],
  );

  return (
    <div className="vault-glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="md:col-span-2 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          className="erp-input w-full pl-10"
          placeholder="Rechercher un document..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <select
        className="erp-select"
        value={filters.categoryKey}
        onChange={e => onChange({ ...filters, categoryKey: e.target.value })}
      >
        {categoryOptions.map(c => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      <select
        className="erp-select"
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value as VaultFilters['status'] })}
      >
        <option value="all">Tous statuts</option>
        {(Object.keys(VAULT_STATUS_LABELS) as VaultDocumentStatus[]).map(s => (
          <option key={s} value={s}>{VAULT_STATUS_LABELS[s]}</option>
        ))}
      </select>

      <select
        className="erp-select md:col-span-1"
        value={filters.ownerType}
        onChange={e => onChange({ ...filters, ownerType: e.target.value as VaultFilters['ownerType'] })}
      >
        <option value="all">Tous propriétaires</option>
        {(Object.keys(VAULT_OWNER_LABELS) as VaultOwnerType[]).map(t => (
          <option key={t} value={t}>{VAULT_OWNER_LABELS[t]}</option>
        ))}
      </select>
    </div>
  );
}
