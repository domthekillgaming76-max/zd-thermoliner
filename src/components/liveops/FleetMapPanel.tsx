import { Link } from 'react-router-dom';
import { MapPin, ChevronRight } from 'lucide-react';
import type { FleetMapVehicle } from '../../lib/liveOpsTypes';
import { TrackingEuropeMap } from '../tracking/TrackingEuropeMap';
import type { DeliveryTracking } from '../../lib/trackingTypes';

interface FleetMapPanelProps {
  vehicles: FleetMapVehicle[];
  loading?: boolean;
  compact?: boolean;
}

function toDeliveryTracking(v: FleetMapVehicle): DeliveryTracking {
  return {
    id: v.id,
    mission_id: null,
    driver_id: v.driverId,
    truck_id: null,
    trailer_id: null,
    departure_city: v.routeSummary.split(' → ')[0] ?? '?',
    arrival_city: v.routeSummary.split(' → ')[1] ?? '?',
    departure_lat: null,
    departure_lng: null,
    arrival_lat: null,
    arrival_lng: null,
    current_lat: v.lat,
    current_lng: v.lng,
    cargo: null,
    distance_km: 0,
    remaining_km: 0,
    progress_percent: v.progressPercent,
    status: v.status as DeliveryTracking['status'],
    eta_at: null,
    delivery_date: null,
    last_status_at: v.lastUpdate,
    paused_at: null,
    source: 'simulated',
    is_active: true,
    created_at: v.lastUpdate,
    updated_at: v.lastUpdate,
    driver_name: v.driverName,
    truck_label: v.truckRegistration,
  };
}

export function FleetMapPanel({ vehicles, loading, compact }: FleetMapPanelProps) {
  const deliveries = vehicles.map(toDeliveryTracking);

  return (
    <div className={`premium-panel rounded-2xl ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-400" />
          <div>
            <h2 className="text-sm font-bold text-white">Carte flotte live</h2>
            <p className="text-[10px] text-white/30">{vehicles.length} véhicule(s) actif(s)</p>
          </div>
        </div>
        {!compact && (
          <Link to="/fleet-map" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            Plein écran <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="h-48 rounded-xl shimmer" />
      ) : (
        <TrackingEuropeMap deliveries={deliveries} markers={[]} />
      )}

      {!loading && vehicles.length > 0 && (
        <div className={`mt-3 space-y-2 ${compact ? 'max-h-32 overflow-y-auto' : ''}`}>
          {vehicles.slice(0, compact ? 3 : 6).map(v => (
            <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.02]">
              <div>
                <p className="font-semibold text-white">{v.driverName}</p>
                <p className="text-white/40">{v.routeSummary}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400/80">{v.status}</p>
                <p className="text-white/25 text-[10px]">
                  {new Date(v.lastUpdate).toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
