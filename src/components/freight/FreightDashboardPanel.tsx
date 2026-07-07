import { Package, TrendingUp, Zap, Snowflake, AlertTriangle, Route, Clock, DollarSign } from 'lucide-react';
import type { FreightDashboard } from '../../lib/freightTypes';
import { formatFreightCurrency } from '../../lib/freightTypes';

interface FreightDashboardPanelProps {
  dashboard: FreightDashboard;
  loading?: boolean;
}

export function FreightDashboardPanel({ dashboard, loading }: FreightDashboardPanelProps) {
  const cards = [
    { label: 'Offres disponibles', value: dashboard.availableOffers, icon: Package, color: '#ef4444' },
    { label: 'Contrats premium', value: dashboard.highValueContracts, icon: DollarSign, color: '#fbbf24' },
    { label: 'Urgentes', value: dashboard.urgentDeliveries, icon: Zap, color: '#f97316' },
    { label: 'Frigo', value: dashboard.refrigeratedFreight, icon: Snowflake, color: '#22d3ee' },
    { label: 'ADR', value: dashboard.adrFreight, icon: AlertTriangle, color: '#a78bfa' },
    { label: 'Longue distance', value: dashboard.longDistanceJobs, icon: Route, color: '#34d399' },
    { label: 'Meilleur €/km', value: formatFreightCurrency(dashboard.bestProfitPerKm), icon: TrendingUp, color: '#10b981', text: true },
    { label: 'Expire bientôt', value: dashboard.expiringOffers, icon: Clock, color: '#fb7185' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div key={card.label} className="freight-stat-card rounded-2xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
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
