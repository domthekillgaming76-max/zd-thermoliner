import {
  Archive, AlertTriangle, Clock, FileCheck, HardDrive, FolderOpen,
} from 'lucide-react';
import type { VaultDashboard } from '../../lib/vaultTypes';
import { formatStorageSize } from '../../lib/vaultTypes';

interface VaultDashboardPanelProps {
  dashboard: VaultDashboard;
  loading?: boolean;
}

export function VaultDashboardPanel({ dashboard, loading }: VaultDashboardPanelProps) {
  const cards = [
    { label: 'Total documents', value: dashboard.totalDocuments, icon: Archive, color: '#ef4444' },
    { label: 'Expire bientôt', value: dashboard.expiringSoon, icon: Clock, color: '#f59e0b' },
    { label: 'Expirés', value: dashboard.expired, icon: AlertTriangle, color: '#f97316' },
    { label: 'En validation', value: dashboard.pendingValidation, icon: FileCheck, color: '#60a5fa' },
    { label: 'Stockage', value: formatStorageSize(dashboard.storageBytes), icon: HardDrive, color: '#22d3ee', text: true },
    { label: 'Catégories', value: dashboard.byCategory.length, icon: FolderOpen, color: '#a78bfa' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="vault-stat-card rounded-2xl p-4"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <card.icon className="w-5 h-5 mb-2" style={{ color: card.color }} />
          <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">{card.label}</p>
          <p className={`mt-1 font-black text-white ${card.text ? 'text-lg' : 'text-2xl'}`}>
            {loading ? '—' : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
