import { Loader2 } from 'lucide-react';
import type { DeliveryTracking, TrackingStatus } from '../../lib/trackingTypes';
import { DRIVER_STATUS_OPTIONS, TRACKING_STATUS_LABELS } from '../../lib/trackingTypes';

interface TrackingDriverPanelProps {
  delivery: DeliveryTracking | null;
  canSimulate?: boolean;
  busy?: boolean;
  onStatusChange: (status: TrackingStatus) => void;
  onProgressChange?: (progress: number) => void;
}

export function TrackingDriverPanel({
  delivery,
  canSimulate,
  busy,
  onStatusChange,
  onProgressChange,
}: TrackingDriverPanelProps) {
  if (!delivery) {
    return (
      <div className="tracking-glass rounded-2xl p-6 text-center text-sm text-white/40">
        Sélectionnez une livraison sur la carte.
      </div>
    );
  }

  return (
    <div className="tracking-glass rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Panneau chauffeur</h3>
        <p className="text-xs text-white/40 mt-0.5">{delivery.driver_name ?? 'Chauffeur'} — {delivery.truck_label}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DRIVER_STATUS_OPTIONS.map(status => (
          <button
            key={status}
            type="button"
            disabled={busy || delivery.status === status}
            onClick={() => onStatusChange(status)}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all ${
              delivery.status === status
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-white/55 hover:bg-white/8 border border-white/8'
            } ${busy ? 'opacity-50' : ''}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : TRACKING_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {canSimulate && onProgressChange && (
        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-2">
            Simulation progression ({delivery.progress_percent}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={delivery.progress_percent}
            className="w-full accent-red-500"
            onChange={e => onProgressChange(Number(e.target.value))}
          />
          <p className="text-[10px] text-white/30 mt-1">Admin — cliquez sur la carte ou utilisez le curseur</p>
        </div>
      )}
    </div>
  );
}
