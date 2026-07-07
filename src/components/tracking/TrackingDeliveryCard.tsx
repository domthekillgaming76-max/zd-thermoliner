import { MapPin, Package, Truck, User } from 'lucide-react';
import type { DeliveryTracking } from '../../lib/trackingTypes';
import { TRACKING_STATUS_COLORS, TRACKING_STATUS_LABELS, formatEta } from '../../lib/trackingTypes';

interface TrackingDeliveryCardProps {
  delivery: DeliveryTracking;
  selected?: boolean;
  onClick?: () => void;
}

export function TrackingDeliveryCard({ delivery: d, selected, onClick }: TrackingDeliveryCardProps) {
  const color = TRACKING_STATUS_COLORS[d.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`tracking-delivery-card rounded-2xl p-4 text-left w-full transition-all ${
        selected ? 'ring-2 ring-red-500/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white font-bold">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">{d.departure_city} → {d.arrival_city}</span>
          </div>
          <p className="text-xs text-white/40 mt-1 truncate">{d.cargo ?? 'Cargo non précisé'}</p>
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-bold shrink-0 border"
          style={{ color, borderColor: `${color}55`, background: `${color}18` }}
        >
          {TRACKING_STATUS_LABELS[d.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-white/45">
        <span className="flex items-center gap-1 truncate"><User className="w-3 h-3" />{d.driver_name ?? '—'}</span>
        <span className="flex items-center gap-1 truncate"><Truck className="w-3 h-3" />{d.truck_label ?? '—'}</span>
        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{d.trailer_label ?? '—'}</span>
        <span>ETA {formatEta(d.eta_at)}</span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-white/35 mb-1">
          <span>{d.progress_percent}%</span>
          <span>{d.remaining_km} km restants / {d.distance_km} km</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${d.progress_percent}%`, background: color }}
          />
        </div>
      </div>
    </button>
  );
}
