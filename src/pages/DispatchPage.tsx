import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Radio, Shield, Filter, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { DispatchDashboard } from '../components/dispatch/DispatchDashboard';
import { DispatchAlertsPanel } from '../components/dispatch/DispatchAlertsPanel';
import { MissionCard } from '../components/dispatch/MissionCard';
import { MissionFormModal } from '../components/dispatch/MissionFormModal';
import { MissionDetailPanel } from '../components/dispatch/MissionDetailPanel';
import { PlanningCalendar } from '../components/dispatch/PlanningCalendar';
import { useAuth } from '../contexts/AuthContext';
import {
  useAssignMission,
  useCancelMission,
  useCreateMission,
  useDeliverMission,
  useDispatchModule,
  useRescheduleMission,
  useStartMission,
  useUpdateMission,
} from '../hooks/useDispatch';
import { canManageDispatch, canMarkMissionDelivered, canViewAllMissions } from '../lib/dispatchPermissions';
import {
  computeDispatchDashboard,
  buildMissionTimeline,
  type TransportMission,
  type MissionStatus,
} from '../lib/dispatchTypes';
import type { MissionFormInput } from '../services/dispatchService';
import { fetchDriverLinkedIds, fetchMissionAssignments, filterMissionsForUser } from '../services/dispatchService';

type TabId = 'dashboard' | 'missions' | 'planning';

const STATUS_FILTERS: { key: 'all' | MissionStatus; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'draft', label: 'Brouillon' },
  { key: 'planned', label: 'Planifiées' },
  { key: 'assigned', label: 'Assignées' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'delivered', label: 'Livrées' },
];

export function DispatchPage() {
  const { profile, user } = useAuth();
  const isManager = canManageDispatch(profile?.role, user?.email);
  const viewAll = canViewAllMissions(profile?.role, user?.email);

  const [tab, setTab] = useState<TabId>('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MissionStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransportMission | null>(null);
  const [selected, setSelected] = useState<TransportMission | null>(null);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchMissionAssignments>>>([]);
  const [linkedDriverIds, setLinkedDriverIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useDispatchModule();
  const createMutation = useCreateMission();
  const updateMutation = useUpdateMission();
  const assignMutation = useAssignMission();
  const startMutation = useStartMission();
  const deliverMutation = useDeliverMission();
  const cancelMutation = useCancelMission();
  const rescheduleMutation = useRescheduleMission();

  useEffect(() => {
    if (user?.id) {
      fetchDriverLinkedIds(user.id).then(setLinkedDriverIds);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selected?.id) {
      fetchMissionAssignments(selected.id).then(setAssignments);
    }
  }, [selected?.id]);

  const visibleMissions = useMemo(
    () => filterMissionsForUser(data?.missions ?? [], viewAll, linkedDriverIds),
    [data?.missions, viewAll, linkedDriverIds],
  );

  const stats = useMemo(
    () => computeDispatchDashboard(
      visibleMissions,
      (data?.drivers ?? []) as { id: string; status: string; driving_status?: string; is_suspended?: boolean }[],
      (data?.trucks ?? []) as { id: string; status: string; driver_id?: string | null }[],
    ),
    [visibleMissions, data?.drivers, data?.trucks],
  );

  const filtered = useMemo(() => {
    let list = visibleMissions;
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(m =>
      [m.reference, m.client_name, m.departure_city, m.arrival_city, m.driver_name, m.cargo]
        .some(v => v?.toLowerCase().includes(q)),
    );
  }, [visibleMissions, search, statusFilter]);

  const timeline = useMemo(
    () => buildMissionTimeline(visibleMissions.slice(0, 20), data?.assignments ?? []),
    [visibleMissions, data?.assignments],
  );

  async function handleSave(input: MissionFormInput) {
    if (!isManager) return;
    setPageError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
        setSuccessMessage('Mission mise à jour.');
      } else {
        await createMutation.mutateAsync({ input, createdBy: user?.id });
        setSuccessMessage('Mission créée.');
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur enregistrement.');
    }
  }

  async function handleAssign(driverId: string | null, truckId: string | null, trailerId: string | null, garageId: string | null, routeNotes: string) {
    if (!selected || !isManager) return;
    try {
      await assignMutation.mutateAsync({
        missionId: selected.id,
        assignment: { driverId, truckId, trailerId, garageId, routeNotes },
        assignedBy: user?.id,
      });
      setSuccessMessage('Affectation enregistrée.');
      setSelected(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Affectation impossible.');
    }
  }

  async function handleDropMission(missionId: string, newDate: string) {
    if (!isManager) return;
    try {
      await rescheduleMutation.mutateAsync({ missionId, deliveryDate: newDate, loadingDate: newDate });
      setSuccessMessage('Mission replanifiée.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Replanification impossible.');
    }
  }

  const selectedCanDeliver = selected
    ? canMarkMissionDelivered(profile?.role, user?.email ?? null, selected.driver_id, linkedDriverIds)
    : false;

  return (
    <Layout>
      <div className="space-y-6 dispatch-module">
        <PageHeader
          title="Dispatch & Planning"
          subtitle="Centre de contrôle transport — missions, affectations et calendrier"
          icon={Radio}
          actions={
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Réf., client, ville..." className="erp-input pl-9 w-48" />
              </div>
              {isManager && (
                <button type="button" onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" />
                  Nouvelle mission
                </button>
              )}
            </div>
          }
        />

        {!isManager && (
          <div className="dispatch-glass rounded-xl p-3 flex items-center gap-2 text-xs text-white/45">
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
            {viewAll ? 'Mode consultation.' : 'Vos missions assignées uniquement.'}
          </div>
        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {data?.migrationRequired && (
          <div className="dispatch-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-200">Tables Dispatch non installées</p>
              <p className="text-xs text-white/45 mt-1">
                Appliquez la migration Supabase : <code className="text-amber-300">npx supabase db push</code>
                {' '}(migration 029 — dispatch_planning)
              </p>
            </div>
          </div>
        )}
        {isError && (
          <FormAlert
            message={
              (error as { message?: string })?.message
              ?? (error instanceof Error ? error.message : 'Erreur de chargement.')
            }
          />
        )}

        <nav className="flex gap-1 flex-wrap">
          {([
            { id: 'dashboard' as TabId, label: 'Tableau de bord' },
            { id: 'missions' as TabId, label: `Missions (${filtered.length})` },
            { id: 'planning' as TabId, label: 'Calendrier' },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <div className="space-y-4">
            <DispatchDashboard stats={stats} loading={isLoading} />
            <div className="grid lg:grid-cols-2 gap-4">
              <DispatchAlertsPanel alerts={data?.alerts ?? []} loading={isLoading} />
              <div className="dispatch-glass rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Filter className="w-4 h-4 text-red-400" /> Timeline récente</h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {timeline.slice(0, 12).map(ev => (
                    <li key={ev.id} className="text-sm py-2 border-b border-white/5 flex gap-3 dispatch-timeline-item">
                      <span className="text-white/30 text-xs w-14 shrink-0">{new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <div>
                        <p className="text-white/80 font-medium">{ev.title}</p>
                        {ev.description && <p className="text-white/35 text-xs">{ev.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === 'missions' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(f => (
                <button key={f.key} type="button" onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === f.key ? 'bg-white/10 text-white' : 'text-white/35 hover:bg-white/5'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="dispatch-glass h-40 shimmer rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="dispatch-glass rounded-2xl p-16 text-center">
                <Radio className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">Aucune mission</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(m => (
                  <MissionCard key={m.id} mission={m} onSelect={setSelected} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'planning' && (
          <PlanningCalendar
            missions={visibleMissions.filter(m => m.status !== 'cancelled')}
            onSelectMission={setSelected}
            onDropMission={handleDropMission}
            canEdit={isManager}
          />
        )}

        {isManager && (
          <MissionFormModal
            open={showForm}
            editing={editing}
            clients={data?.clients ?? []}
            saving={createMutation.isPending || updateMutation.isPending}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSubmit={handleSave}
          />
        )}

        {selected && (
          <MissionDetailPanel
            mission={selected}
            assignments={assignments}
            drivers={(data?.drivers ?? []) as { id: string; name: string }[]}
            trucks={(data?.trucks ?? []) as { id: string; registration: string; brand?: string | null }[]}
            trailers={(data?.trailers ?? []) as { id: string; registration: string; type: string }[]}
            garages={(data?.garages ?? []) as { id: string; name: string }[]}
            canManage={isManager}
            canDeliver={selectedCanDeliver}
            assigning={assignMutation.isPending}
            delivering={deliverMutation.isPending}
            onClose={() => setSelected(null)}
            onAssign={handleAssign}
            onStart={async () => {
              try {
                await startMutation.mutateAsync(selected.id);
                setSuccessMessage('Mission démarrée.');
                setSelected(null);
              } catch (err) {
                setPageError(err instanceof Error ? err.message : 'Erreur.');
              }
            }}
            onDeliver={async () => {
              try {
                await deliverMutation.mutateAsync(selected.id);
                setSuccessMessage('Mission livrée — feuille de route créée pour validation.');
                setSelected(null);
              } catch (err) {
                setPageError(err instanceof Error ? err.message : 'Erreur livraison.');
              }
            }}
            onCancel={async () => {
              if (!confirm('Annuler cette mission ?')) return;
              try {
                await cancelMutation.mutateAsync(selected.id);
                setSuccessMessage('Mission annulée.');
                setSelected(null);
              } catch (err) {
                setPageError(err instanceof Error ? err.message : 'Erreur.');
              }
            }}
            onEdit={isManager ? () => {
              setEditing(selected);
              setShowForm(true);
              setSelected(null);
            } : undefined}
          />
        )}
      </div>
    </Layout>
  );
}
