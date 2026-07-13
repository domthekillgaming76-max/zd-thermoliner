import { Truck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface TruckItemProps {
  id: string;
  registration: string;
  model: string;
  driver?: string;
  status: 'available' | 'in_transit' | 'maintenance' | 'offline';
  lastUpdate?: string;
  mileage?: number;
  fuelLevel?: number;
}

const STATUS_CONFIG = {
  available: { 
    icon: CheckCircle2, 
    label: 'Disponible', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/25', 
    text: 'text-emerald-300',
    dot: 'bg-emerald-400'
  },
  in_transit: { 
    icon: Truck, 
    label: 'En trajet', 
    bg: 'bg-cyan-500/10', 
    border: 'border-cyan-500/25', 
    text: 'text-cyan-300',
    dot: 'bg-cyan-400'
  },
  maintenance: { 
    icon: AlertTriangle, 
    label: 'Maintenance', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/25', 
    text: 'text-amber-300',
    dot: 'bg-amber-400'
  },
  offline: { 
    icon: Clock, 
    label: 'Hors ligne', 
    bg: 'bg-white/5', 
    border: 'border-white/10', 
    text: 'text-white/40',
    dot: 'bg-white/25'
  },
};

function TruckItem({ registration, model, driver, status, lastUpdate, mileage, fuelLevel }: TruckItemProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`p-4 rounded-lg border transition-all duration-200 hover:border-opacity-50 ${config.bg} ${config.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
          <Truck className={`w-5 h-5 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-bold text-white">{registration}</p>
              <p className="text-xs text-white/50">{model}</p>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded whitespace-nowrap ${config.text}`}>
              <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
              {config.label}
            </div>
          </div>

          {driver && (
            <p className="text-xs text-white/60 mb-2">👤 {driver}</p>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            {mileage !== undefined && (
              <div className="text-[10px]">
                <p className="text-white/40">Kilométrage</p>
                <p className="font-semibold text-white">{mileage.toLocaleString('fr-FR')} km</p>
              </div>
            )}
            {fuelLevel !== undefined && (
              <div className="text-[10px]">
                <p className="text-white/40">Carburant</p>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        fuelLevel >= 50 ? 'bg-emerald-500' :
                        fuelLevel >= 25 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${fuelLevel}%` }}
                    />
                  </div>
                  <span className="text-white/60">{fuelLevel}%</span>
                </div>
              </div>
            )}
          </div>

          {lastUpdate && (
            <p className="text-[10px] text-white/30 mt-2">Mis à jour: {lastUpdate}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface GaragePanelProps {
  title?: string;
  subtitle?: string;
  trucks: TruckItemProps[];
  emptyMessage?: string;
}

export function GaragePanel({
  title = 'Garage & Flotte',
  subtitle = 'État et disponibilité des véhicules',
  trucks,
  emptyMessage = 'Aucun véhicule dans le garage',
}: GaragePanelProps) {
  const stats = {
    available: trucks.filter(t => t.status === 'available').length,
    in_transit: trucks.filter(t => t.status === 'in_transit').length,
    maintenance: trucks.filter(t => t.status === 'maintenance').length,
    offline: trucks.filter(t => t.status === 'offline').length,
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(31,31,31,0.6) 0%, rgba(15,15,15,0.8) 100%)',
        border: '1px solid rgba(239,68,68,0.15)',
      }}
    >
      <div
        className="p-5 md:p-6 border-b"
        style={{ borderColor: 'rgba(239,68,68,0.1)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-300/70 mb-0.5">Disponibles</p>
            <p className="text-lg font-bold text-emerald-300">{stats.available}</p>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xs text-cyan-300/70 mb-0.5">En trajet</p>
            <p className="text-lg font-bold text-cyan-300">{stats.in_transit}</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300/70 mb-0.5">Maintenance</p>
            <p className="text-lg font-bold text-amber-300">{stats.maintenance}</p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-0.5">Hors ligne</p>
            <p className="text-lg font-bold text-white/60">{stats.offline}</p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-3 max-h-96 overflow-y-auto">
        {trucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Truck className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-center text-white/30 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          trucks.map(truck => (
            <TruckItem key={truck.id} {...truck} />
          ))
        )}
      </div>
    </div>
  );
}
