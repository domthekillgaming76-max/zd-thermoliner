import { AlertTriangle, Building2, FileText, Star, TrendingUp } from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import type { ClientsDashboardStats } from '../../lib/clientTypes';

interface ClientsDashboardProps {
  stats: ClientsDashboardStats;
  loading?: boolean;
}

export function ClientsDashboard({ stats, loading }: ClientsDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="client-glass h-24 shimmer rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    { label: 'Total clients', value: stats.totalClients, icon: Building2, accent: 'text-white' },
    { label: 'Clients actifs', value: stats.activeClients, icon: Building2, accent: 'text-emerald-400' },
    { label: 'CA mensuel', value: fmtEuro(stats.monthlyRevenue), icon: TrendingUp, accent: 'text-emerald-400' },
    { label: 'Factures impayées', value: stats.unpaidInvoices, icon: FileText, accent: 'text-amber-400' },
    { label: 'Paiements en retard', value: stats.latePayments, icon: AlertTriangle, accent: 'text-red-400' },
    { label: 'Contrats à échéance', value: stats.contractsEndingSoon, icon: FileText, accent: 'text-amber-400' },
    { label: 'Meilleur client', value: stats.bestClientName ?? '—', sub: stats.bestClientRevenue > 0 ? fmtEuro(stats.bestClientRevenue) : undefined, icon: Star, accent: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <div key={c.label} className="client-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 50}ms` }}>
          <c.icon className={`w-5 h-5 mb-2 ${c.accent}`} />
          <p className="text-lg font-black text-white truncate">{c.value}</p>
          {c.sub && <p className="text-xs text-emerald-400 font-bold">{c.sub}</p>}
          <p className="text-[10px] text-white/35 uppercase tracking-wide mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
