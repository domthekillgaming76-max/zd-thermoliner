import { Search } from 'lucide-react';
import type { FreightFilterKey } from '../../lib/freightTypes';

export interface FreightFilters {
  search: string;
  filter: FreightFilterKey;
  clientId: string;
}

const FILTERS: { key: FreightFilterKey; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'best_profit', label: 'Meilleur profit' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'refrigerated', label: 'Frigo' },
  { key: 'adr', label: 'ADR' },
  { key: 'long_distance', label: 'Longue distance' },
  { key: 'short_distance', label: 'Courte distance' },
  { key: 'high_value', label: 'Haute valeur' },
  { key: 'chained', label: 'Routes chaînées' },
  { key: 'expiring', label: 'Expire bientôt' },
];

interface FreightFiltersBarProps {
  filters: FreightFilters;
  clients: { id: string; name: string }[];
  onChange: (f: FreightFilters) => void;
}

export function FreightFiltersBar({ filters, clients, onChange }: FreightFiltersBarProps) {
  return (
    <div className="freight-glass rounded-2xl p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          className="erp-input w-full pl-10"
          placeholder="Rechercher ville, client, cargo..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange({ ...filters, filter: f.key })}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              filters.filter === f.key
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-white/40 border border-white/8'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <select
        className="erp-select w-full sm:w-64"
        value={filters.clientId}
        onChange={e => onChange({ ...filters, clientId: e.target.value })}
      >
        <option value="">Tous les clients</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
