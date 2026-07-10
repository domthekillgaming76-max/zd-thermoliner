import { Loader2, Truck, Fuel, AlertTriangle, MapPin, Radio } from 'lucide-react';
import { TelemetryMissionCard } from '../telemetry/TelemetryMissionCard';
import { TelemetryJobTimeline } from '../telemetry/TelemetryJobTimeline';
import { useDriverTelemetryJobs } from '../../hooks/useTelemetryJobs';
import { computeTelemetryDriverStats } from '../../lib/telemetryJobTypes';
import { fmtEuro } from '../../lib/format';

interface DriverTelemetryDeliveriesPanelProps {
  profileId: string;
}

export function DriverTelemetryDeliveriesPanel({ profileId }: DriverTelemetryDeliveriesPanelProps) {
  const { data: jobs = [], isLoading } = useDriverTelemetryJobs(profileId);
  const stats = computeTelemetryDriverStats(jobs);
  const activeJob = jobs.find(j => ['detected', 'active', 'paused'].includes(j.status));
  const history = jobs.filter(j => !['detected', 'active', 'paused'].includes(j.status)).slice(0, 15);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Km totaux', value: `${Math.round(stats.totalKm)} km`, icon: MapPin },
          { label: 'Livraisons', value: String(stats.completedDeliveries), icon: Truck },
          { label: 'Revenus', value: fmtEuro(stats.totalRevenue), icon: Radio },
          { label: 'Carburant', value: `${Math.round(stats.fuelUsed)} L`, icon: Fuel },
        ].map(item => (
          <div key={item.label} className="erp-card rounded-xl p-3 border border-white/5">
            <item.icon className="w-4 h-4 text-red-400 mb-1" />
            <p className="text-[10px] text-white/40">{item.label}</p>
            <p className="text-sm font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="erp-card rounded-xl p-3">
          <p className="text-white/40 text-xs">Annulées</p>
          <p className="font-bold text-red-400">{stats.cancelledDeliveries}</p>
        </div>
        <div className="erp-card rounded-xl p-3">
          <p className="text-white/40 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Dégâts moyens</p>
          <p className="font-bold text-amber-400">{(stats.averageDamage * 100).toFixed(1)}%</p>
        </div>
        <div className="erp-card rounded-xl p-3">
          <p className="text-white/40 text-xs">Dernière livraison</p>
          <p className="font-bold text-white text-xs">
            {stats.lastDeliveryAt
              ? new Date(stats.lastDeliveryAt).toLocaleString('fr-FR')
              : '—'}
          </p>
        </div>
      </div>

      {activeJob && (
        <div>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Mission en cours
          </h3>
          <TelemetryMissionCard job={activeJob} />
          <TelemetryJobTimeline job={activeJob} />
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-white mb-3">Historique des missions</h3>
        {history.length === 0 ? (
          <p className="text-white/40 text-sm">Aucune livraison automatique enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {history.map(job => (
              <TelemetryMissionCard key={job.id} job={job} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
