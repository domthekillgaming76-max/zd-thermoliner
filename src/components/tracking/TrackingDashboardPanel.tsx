import { Radio, Truck, Users, Pause, AlertTriangle, Clock, MapPin } from 'lucide-react';
import type { TrackingDashboard } from '../../lib/trackingTypes';

interface TrackingDashboardPanelProps {
  dashboard: TrackingDashboard;
  loading?: boolean;
}

export function TrackingDashboardPanel({ dashboard, loading }: TrackingDashboardPanelProps) {
  const cards = [
    { label: 'Livraisons actives', value: dashboard.activeDeliveries, icon: Radio, color: '#ef4444' },
    { label: 'Chauffeurs en route', value: dashboard.driversOnRoute, icon: Users, color: '#22d3ee' },
    { label: 'Camions en mouvement', value: dashboard.trucksMoving, icon: Truck, color: '#34d399' },
    { label: 'Camions à l\'arrêt', value: dashboard.trucksStopped, icon: Pause, color: '#f59e0b' },
    { label: 'Retards', value: dashboard.lateDeliveries, icon: AlertTriangle, color: '#f97316' },
    { label: 'ETA estimées', value: dashboard.estimatedArrivals, icon: Clock, color: '#a78bfa' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <div key={card.label} className="tracking-stat-card rounded-2xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
          <card.icon className="w-5 h-5 mb-2" style={{ color: card.color }} />
          <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">{card.label}</p>
          <p className="text-2xl font-black text-white mt-1">{loading ? '—' : card.value}</p>
        </div>
      ))}
      <div className="tracking-stat-card rounded-2xl p-4 col-span-2 md:col-span-3 lg:col-span-6 flex items-center gap-2 text-xs text-white/35">
        <MapPin className="w-4 h-4 text-red-400" />
        Vue cartographique Europe — positions simulées en attendant TruckersMP / ETS2 / GPS API
      </div>
    </div>
  );
}
