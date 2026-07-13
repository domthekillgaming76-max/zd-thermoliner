import { Link } from 'react-router-dom';
import { MapPin, ChevronRight, Truck, RefreshCw } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { FleetMapVehicle } from '../../lib/liveOpsTypes';
import { TrackingEuropeMap } from '../tracking/TrackingEuropeMap';
import type { DeliveryTracking } from '../../lib/trackingTypes';

interface FleetMapPanelProps {
  vehicles: FleetMapVehicle[];
  loading?: boolean;
  compact?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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

function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  switch (status.toLowerCase()) {
    case 'on_route':
    case 'late':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' };
    case 'paused':
    case 'loading':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' };
    case 'delivered':
    case 'arrived':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' };
    case 'cancelled':
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' };
    case 'offline':
      return { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' };
    default:
      return { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' };
  }
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'on_route': 'En livraison',
    'late': 'En retard',
    'paused': 'En pause',
    'loading': 'Chargement',
    'delivered': 'Livré',
    'arrived': 'Arrivé',
    'cancelled': 'Annulé',
    'offline': 'Hors ligne',
  };
  return labels[status.toLowerCase()] || status;
}

const STATUS_LEGEND = [
  { status: 'on_route', label: 'En livraison', color: 'bg-cyan-400' },
  { status: 'paused', label: 'En pause', color: 'bg-amber-400' },
  { status: 'arrived', label: 'Arrivé', color: 'bg-emerald-400' },
  { status: 'offline', label: 'Hors ligne', color: 'bg-red-400' },
];

export function FleetMapPanel({ vehicles, loading, compact, onRefresh, isRefreshing }: FleetMapPanelProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const onRoute = vehicles.filter(v => v.status.toLowerCase() === 'on_route' || v.status.toLowerCase() === 'late').length;
    const paused = vehicles.filter(v => v.status.toLowerCase() === 'paused' || v.status.toLowerCase() === 'loading').length;
    const arrived = vehicles.filter(v => v.status.toLowerCase() === 'delivered' || v.status.toLowerCase() === 'arrived').length;
    const offline = vehicles.length - onRoute - paused - arrived;
    return { onRoute, paused, arrived, offline };
  }, [vehicles]);

  const deliveries = vehicles.map(toDeliveryTracking);
  const selectedVehicle = selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) : null;

  return (
    <div className={`premium-panel rounded-2xl ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
      {/* En-tête Premium */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-300" />
              <div className="relative bg-gradient-to-br from-gray-800 to-black rounded-lg p-2.5">
                <MapPin className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-white truncate">Flotte en direct</h2>
              <p className="text-xs text-white/40">Suivi en temps réel des véhicules</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 text-white/60 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            {!compact && (
              <Link
                to="/fleet-map"
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors"
              >
                Plein écran <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Stats en-tête */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 text-center">
            <p className="text-xl md:text-2xl font-bold text-white">{vehicles.length}</p>
            <p className="text-[10px] md:text-xs text-white/50">Total</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-lg p-2.5 text-center">
            <p className="text-xl md:text-2xl font-bold text-cyan-400">{stats.onRoute}</p>
            <p className="text-[10px] md:text-xs text-cyan-300/70">En route</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 text-center">
            <p className="text-xl md:text-2xl font-bold text-amber-400">{stats.paused}</p>
            <p className="text-[10px] md:text-xs text-amber-300/70">En pause</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2.5 text-center">
            <p className="text-xl md:text-2xl font-bold text-emerald-400">{stats.arrived}</p>
            <p className="text-[10px] md:text-xs text-emerald-300/70">Livrés</p>
          </div>
        </div>

        {/* Légende */}
        {!compact && (
          <div className="flex flex-wrap gap-2 pt-2">
            {STATUS_LEGEND.map(item => (
              <div key={item.status} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/10">
                <div className={`w-2 h-2 rounded-full ${item.color} animate-pulse`} />
                <span className="text-white/70">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carte */}
      {loading ? (
        <div className="h-48 md:h-64 rounded-xl shimmer" />
      ) : vehicles.length === 0 ? (
        <div className="h-48 md:h-64 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <Truck className="w-12 h-12 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/50">Aucun véhicule en ligne</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl">
          <TrackingEuropeMap
            deliveries={deliveries}
            markers={[]}
            compact
            selectedId={selectedVehicleId}
            onSelect={setSelectedVehicleId}
          />
        </div>
      )}

      {/* Liste des véhicules ou détails sélection */}
      {!loading && vehicles.length > 0 && (
        <div className={`mt-4 space-y-2 ${compact ? 'max-h-40' : 'max-h-96'} overflow-y-auto`}>
          {selectedVehicle ? (
            /* Détails du véhicule sélectionné */
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  className="text-xs text-white/50 hover:text-white/70 transition-colors"
                >
                  ← Retour à la liste
                </button>
              </div>
              <div className={`p-4 rounded-xl border ${getStatusColor(selectedVehicle.status).bg} border-white/10`}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/50 mb-1">Chauffeur</p>
                    <p className="text-sm font-bold text-white">{selectedVehicle.driverName}</p>
                  </div>
                  {selectedVehicle.truckRegistration && (
                    <div>
                      <p className="text-xs text-white/50 mb-1">Véhicule</p>
                      <p className="text-sm font-semibold text-white/80 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        {selectedVehicle.truckRegistration}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/50 mb-1">Trajet</p>
                    <p className="text-sm text-white/80">{selectedVehicle.routeSummary}</p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-white/50 mb-1">Statut</p>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${getStatusColor(selectedVehicle.status).bg} ${getStatusColor(selectedVehicle.status).text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(selectedVehicle.status).dot}`} />
                          {formatStatusLabel(selectedVehicle.status)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-white/50 mb-1">Progression</p>
                        <p className="text-sm font-semibold text-white">{Math.round(selectedVehicle.progressPercent)}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 text-xs text-white/40 text-right">
                    Mis à jour {new Date(selectedVehicle.lastUpdate).toLocaleTimeString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Liste compacte des véhicules */
            vehicles.slice(0, compact ? 4 : 8).map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`group cursor-pointer p-3 rounded-lg transition-all duration-300 ${getStatusColor(v.status).bg} border border-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5 animate-slideUp`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate">{v.driverName}</p>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(v.status).dot} flex-shrink-0 animate-pulse`} />
                    </div>
                    <p className="text-xs text-white/60 truncate">{v.routeSummary}</p>
                    {v.truckRegistration && (
                      <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {v.truckRegistration}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${getStatusColor(v.status).text}`}>
                      {formatStatusLabel(v.status)}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">
                      {Math.round(v.progressPercent)}%
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Styles animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out forwards;
        }
        
        .animate-slideUp:nth-child(1) { animation-delay: 0.05s; }
        .animate-slideUp:nth-child(2) { animation-delay: 0.1s; }
        .animate-slideUp:nth-child(3) { animation-delay: 0.15s; }
        .animate-slideUp:nth-child(4) { animation-delay: 0.2s; }
        .animate-slideUp:nth-child(5) { animation-delay: 0.25s; }
        .animate-slideUp:nth-child(6) { animation-delay: 0.3s; }
        .animate-slideUp:nth-child(7) { animation-delay: 0.35s; }
        .animate-slideUp:nth-child(8) { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
}
