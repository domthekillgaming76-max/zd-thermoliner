import { Bell, Gauge, MapPin, Truck, Container, Wallet } from 'lucide-react';
import type { DriverPortalBundle } from '../../lib/driverPortalTypes';
import {
  DRIVER_PRESENCE_COLORS,
  DRIVER_PRESENCE_LABELS,
  formatDriverCurrency,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS,
} from '../../lib/driverPortalTypes';
import { DriverQuickActions } from './DriverQuickActions';

interface DriverHomePanelProps {
  data: DriverPortalBundle;
  onAction: (action: string) => void;
  busy?: boolean;
}

export function DriverHomePanel({ data, onAction, busy }: DriverHomePanelProps) {
  const { home, notifications } = data;
  const mission = home.todayMission;
  const presenceClass = DRIVER_PRESENCE_COLORS[home.presenceStatus];

  return (
    <div className="space-y-4 driver-portal-fade-in">
      <div className="driver-portal-glass driver-portal-truck-card rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide font-semibold">Statut actuel</p>
            <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold border ${presenceClass}`}>
              {DRIVER_PRESENCE_LABELS[home.presenceStatus]}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Notifications</p>
            <p className="text-2xl font-black text-red-400">{home.unreadNotifications}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="driver-portal-stat-card rounded-2xl p-4 col-span-2">
          <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-2">Mission du jour</p>
          {mission ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">{mission.departure_city} → {mission.arrival_city}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/45 truncate">{mission.cargo ?? 'Cargo non précisé'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${MISSION_STATUS_COLORS[mission.status]}`}>
                  {MISSION_STATUS_LABELS[mission.status]}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/45">Aucune mission assignée aujourd&apos;hui.</p>
          )}
        </div>

        <div className="driver-portal-stat-card rounded-2xl p-4">
          <Truck className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-[10px] text-white/40 uppercase font-semibold">Camion</p>
          <p className="text-sm font-bold text-white mt-1 truncate">{home.truckLabel ?? '—'}</p>
        </div>

        <div className="driver-portal-stat-card rounded-2xl p-4">
          <Container className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-[10px] text-white/40 uppercase font-semibold">Remorque</p>
          <p className="text-sm font-bold text-white mt-1 truncate">{home.trailerLabel ?? '—'}</p>
        </div>

        <div className="driver-portal-stat-card rounded-2xl p-4">
          <Gauge className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-[10px] text-white/40 uppercase font-semibold">KM mensuel</p>
          <p className="text-xl font-black text-white mt-1">{home.monthlyKm.toLocaleString('fr-FR')} km</p>
        </div>

        <div className="driver-portal-stat-card rounded-2xl p-4">
          <Wallet className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-[10px] text-white/40 uppercase font-semibold">Salaire estimé</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{formatDriverCurrency(home.salaryEstimate)}</p>
        </div>
      </div>

      <DriverQuickActions
        mission={mission}
        onAction={onAction}
        busy={busy}
      />

      {notifications.length > 0 && (
        <div className="driver-portal-glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-400" />
            <p className="text-sm font-bold text-white">Notifications récentes</p>
          </div>
          {notifications.slice(0, 4).map(n => (
            <div
              key={n.id}
              className={`rounded-xl px-3 py-2.5 border ${n.read ? 'border-white/5 bg-white/[0.02]' : 'border-red-500/20 bg-red-500/5'}`}
            >
              <p className="text-sm font-semibold text-white">{n.title}</p>
              {n.message && <p className="text-xs text-white/45 mt-0.5">{n.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
