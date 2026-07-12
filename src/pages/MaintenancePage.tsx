import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, AlertTriangle, Calendar, CheckCircle2, Truck, Clock, Search, Shield,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert } from '../components/erp/FormAlert';
import { useFleetModule } from '../hooks/useFleet';
import { useAuth } from '../contexts/AuthContext';
import { canManageFleet } from '../lib/fleetPermissions';
import {
  getMaintenanceAlerts,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_STYLES,
  MAINTENANCE_TYPE_LABELS,
  type FleetMaintenance,
  type MaintenanceStatus,
} from '../lib/fleetTypes';
import { fmtEuro } from '../lib/format';

type TabId = 'overview' | 'schedule' | 'alerts';
type StatusFilter = 'all' | MaintenanceStatus;

function computeMaintenanceStats(
  maintenance: FleetMaintenance[],
  trucksInMaintenance: number,
  alertCount: number,
) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return {
    trucksInMaintenance,
    scheduled: maintenance.filter(m => m.status === 'scheduled').length,
    inProgress: maintenance.filter(m => m.status === 'in_progress').length,
    completedMonth: maintenance.filter(m => m.status === 'completed' && m.completed_date?.startsWith(month)).length,
    overdue: maintenance.filter(m => m.status === 'scheduled' && m.scheduled_date && m.scheduled_date < today).length,
    alerts: alertCount,
  };
}

export function MaintenancePage() {
  const { profile, user } = useAuth();
  const canManage = canManageFleet(profile?.role, user?.email);
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading, isError, error } = useFleetModule();

  const trucks = useMemo(() => data?.trucks ?? [], [data?.trucks]);
  const maintenance = useMemo(() => data?.maintenance ?? [], [data?.maintenance]);
  const truckMap = useMemo(() => new Map(trucks.map(t => [t.id, t])), [trucks]);

  const alerts = useMemo(
    () => getMaintenanceAlerts(trucks, maintenance),
    [trucks, maintenance],
  );

  const stats = useMemo(
    () => computeMaintenanceStats(
      maintenance,
      trucks.filter(t => t.status === 'maintenance').length,
      alerts.length,
    ),
    [maintenance, trucks, alerts],
  );

  const filtered = useMemo(() => {
    let list = maintenance;
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(m => {
      const truck = truckMap.get(m.truck_id);
      const label = [truck?.registration, truck?.brand, m.title, MAINTENANCE_TYPE_LABELS[m.maintenance_type]]
        .filter(Boolean).join(' ').toLowerCase();
      return label.includes(q);
    });
  }, [maintenance, statusFilter, search, truckMap]);

  return (
    <Layout>
      <div className="space-y-6 fleet-module">
        <PageHeader
          title="Maintenance"
          subtitle="Suivi des réparations, entretiens et alertes véhicules"
          icon={Wrench}
          actions={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Camion, type, titre..."
                className="erp-input pl-9 w-48"
              />
            </div>
          }
        />

        {!canManage && (
          <div className="fleet-glass rounded-xl p-3 flex items-center gap-2 text-xs text-white/45">
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
            Mode consultation — planification via la fiche camion (Flotte).
          </div>
        )}

        {isError && (
          <FormAlert message={(error as { message?: string })?.message ?? 'Erreur de chargement.'} />
        )}

        <nav className="flex gap-1 flex-wrap">
          {([
            { id: 'overview' as TabId, label: 'Tableau de bord' },
            { id: 'schedule' as TabId, label: `Planning (${filtered.length})` },
            { id: 'alerts' as TabId, label: `Alertes (${alerts.length})` },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'En atelier', value: stats.trucksInMaintenance, icon: Truck, color: 'text-amber-400' },
                { label: 'Planifiées', value: stats.scheduled, icon: Calendar, color: 'text-blue-400' },
                { label: 'En cours', value: stats.inProgress, icon: Wrench, color: 'text-red-400' },
                { label: 'Terminées (mois)', value: stats.completedMonth, icon: CheckCircle2, color: 'text-emerald-400' },
                { label: 'En retard', value: stats.overdue, icon: Clock, color: 'text-orange-400' },
                { label: 'Alertes', value: stats.alerts, icon: AlertTriangle, color: 'text-red-400' },
              ].map((c, i) => (
                <div key={c.label} className="fleet-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
                  <c.icon className={`w-4 h-4 mb-2 ${c.color}`} />
                  <p className="text-xl font-black text-white">{c.value}</p>
                  <p className="text-[10px] text-white/35 uppercase">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="fleet-glass rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Prochaines interventions</h3>
                {isLoading ? (
                  <div className="h-32 shimmer rounded-lg" />
                ) : filtered.filter(m => ['scheduled', 'in_progress'].includes(m.status)).slice(0, 6).length === 0 ? (
                  <p className="text-white/30 text-sm">Aucune intervention planifiée.</p>
                ) : (
                  <ul className="space-y-2">
                    {filtered.filter(m => ['scheduled', 'in_progress'].includes(m.status)).slice(0, 6).map(m => (
                      <MaintenanceRow key={m.id} record={m} truck={truckMap.get(m.truck_id)} />
                    ))}
                  </ul>
                )}
              </div>
              <div className="fleet-glass rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Alertes véhicules
                </h3>
                {alerts.length === 0 ? (
                  <p className="text-white/30 text-sm">Flotte opérationnelle.</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {alerts.slice(0, 8).map((a, i) => (
                      <li key={i} className={`text-sm py-2 border-b border-white/5 ${a.urgency === 'high' ? 'text-red-300' : 'text-amber-200/80'}`}>
                        <Link to={`/fleet/${a.truckId}`} className="font-semibold text-white hover:text-red-300">{a.truckLabel}</Link>
                        <span className="block text-xs text-white/40">{a.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['all', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === s ? 'bg-white/10 text-white' : 'text-white/35 hover:bg-white/5'}`}>
                  {s === 'all' ? 'Toutes' : MAINTENANCE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {isLoading ? (
              <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="fleet-glass h-20 shimmer rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="fleet-glass rounded-2xl p-16 text-center">
                <Wrench className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">Aucune maintenance</p>
                <Link to="/fleet" className="inline-block mt-4 text-sm text-red-400 hover:text-red-300">Gérer via Flotte →</Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map(m => (
                  <div key={m.id} className="fleet-glass fleet-card-hover rounded-xl p-4 border border-white/5">
                    <MaintenanceRow record={m} truck={truckMap.get(m.truck_id)} detailed />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="fleet-glass rounded-xl p-4">
            {alerts.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
                <p className="text-white/40">Aucune alerte active</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {alerts.map((a, i) => (
                  <li key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${
                    a.urgency === 'high' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 ${a.urgency === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <Link to={`/fleet/${a.truckId}`} className="font-bold text-white hover:text-red-300">{a.truckLabel}</Link>
                      <p className="text-sm text-white/50">{a.message}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      a.urgency === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {a.urgency === 'high' ? 'Urgent' : 'À surveiller'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function MaintenanceRow({
  record,
  truck,
  detailed,
}: {
  record: FleetMaintenance;
  truck?: { id: string; registration: string; brand?: string | null; model?: string | null };
  detailed?: boolean;
}) {
  const st = MAINTENANCE_STATUS_STYLES[record.status];
  const label = MAINTENANCE_STATUS_LABELS[record.status];
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-white">
            {MAINTENANCE_TYPE_LABELS[record.maintenance_type]} — {record.title}
          </p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st}`}>{label}</span>
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          {truck ? (
            <Link to={`/fleet/${truck.id}`} className="hover:text-red-300">{truck.registration} {truck.brand ?? ''}</Link>
          ) : 'Camion inconnu'}
          {record.scheduled_date && ` · ${new Date(record.scheduled_date).toLocaleDateString('fr-FR')}`}
          {detailed && record.estimated_cost > 0 && ` · ${fmtEuro(record.estimated_cost)}`}
        </p>
      </div>
      {record.validated && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
    </div>
  );
}
