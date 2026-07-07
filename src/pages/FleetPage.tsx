import { useMemo, useState } from 'react';
import { Plus, Search, Truck as TruckIcon, AlertTriangle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FleetDashboard } from '../components/fleet/FleetDashboard';
import { TruckCard } from '../components/fleet/TruckCard';
import { TruckFormModal } from '../components/fleet/TruckFormModal';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import {
  useCreateFleetTruck,
  useDeleteFleetTruck,
  useFleetModule,
  useUpdateFleetTruck,
} from '../hooks/useFleet';
import { useAuth } from '../contexts/AuthContext';
import { canManageFleet } from '../lib/fleetPermissions';
import {
  computeFleetDashboard,
  getMaintenanceAlerts,
  type FleetTruck,
  type TruckStatus,
} from '../lib/fleetTypes';
import type { TruckFormInput } from '../services/fleetService';

type TabId = 'dashboard' | 'trucks';
type StatusFilter = 'all' | TruckStatus;

export function FleetPage() {
  const { profile, user } = useAuth();
  const isAdmin = canManageFleet(profile?.role, user?.email);
  const [tab, setTab] = useState<TabId>('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FleetTruck | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useFleetModule();
  const createMutation = useCreateFleetTruck();
  const updateMutation = useUpdateFleetTruck();
  const deleteMutation = useDeleteFleetTruck();

  const stats = useMemo(
    () => computeFleetDashboard(data?.trucks ?? [], data?.costs ?? []),
    [data?.trucks, data?.costs],
  );

  const alerts = useMemo(
    () => getMaintenanceAlerts(data?.trucks ?? [], data?.maintenance ?? []),
    [data?.trucks, data?.maintenance],
  );

  const filtered = useMemo(() => {
    let list = data?.trucks ?? [];
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(t =>
      [t.registration, t.brand, t.model, t.vin, t.driver_name, t.garage_name]
        .some(v => v?.toLowerCase().includes(q)),
    );
  }, [data?.trucks, search, statusFilter]);

  function openAdd() {
    if (!isAdmin) return;
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(truck: FleetTruck) {
    if (!isAdmin) return;
    setEditing(truck);
    setShowModal(true);
  }

  async function handleSave(input: TruckFormInput) {
    if (!isAdmin) return;
    setPageError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
        setSuccessMessage('Camion mis à jour.');
      } else {
        await createMutation.mutateAsync(input);
        setSuccessMessage('Camion ajouté.');
      }
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm('Supprimer ce camion ?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSuccessMessage('Camion supprimé.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-6 fleet-module">
        <PageHeader
          title="Gestion de flotte"
          subtitle="Pilotage véhicules, maintenance et rentabilité"
          icon={TruckIcon}
          actions={
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Immat., marque, chauffeur..."
                  className="erp-input pl-9 w-52"
                />
              </div>
              {isAdmin && (
                <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm">
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              )}
            </div>
          }
        />

        {!isAdmin && (
          <div className="fleet-glass rounded-xl p-3 flex items-center gap-2 text-xs text-white/45">
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
            Mode consultation — seuls les administrateurs peuvent modifier la flotte.
          </div>
        )}

        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur de chargement.'} />}

        <nav className="flex gap-1">
          {([
            { id: 'dashboard' as TabId, label: 'Tableau de bord' },
            { id: 'trucks' as TabId, label: `Camions (${data?.trucks.length ?? 0})` },
          ]).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <FleetDashboard stats={stats} loading={isLoading} />
        )}

        {tab === 'trucks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'all' as StatusFilter, label: 'Tous' },
                { id: 'active' as StatusFilter, label: 'En service' },
                { id: 'maintenance' as StatusFilter, label: 'Maintenance' },
                { id: 'retired' as StatusFilter, label: 'Retirés' },
              ]).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === f.id ? 'bg-white/10 text-white' : 'text-white/35 hover:bg-white/5'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {alerts.length > 0 && (
              <div className="fleet-glass rounded-xl p-4 space-y-2 border border-amber-500/15">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Alertes maintenance ({alerts.length})
                </p>
                <ul className="space-y-1">
                  {alerts.slice(0, 6).map((a, i) => (
                    <li key={i} className="text-sm flex items-center justify-between gap-2">
                      <span className={`${a.urgency === 'high' ? 'text-red-300' : 'text-white/60'}`}>
                        {a.truckLabel} — {a.message}
                      </span>
                      <Link to={`/fleet/${a.truckId}`} className="text-xs text-red-400 shrink-0 hover:text-red-300">
                        Voir →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="fleet-glass h-64 shimmer rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="fleet-glass rounded-2xl p-16 text-center">
                <TruckIcon className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">Aucun camion trouvé</p>
                {isAdmin && (
                  <button type="button" onClick={openAdd} className="mt-4 text-red-400 text-sm hover:text-red-300">
                    + Ajouter un camion
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(truck => (
                  <TruckCard
                    key={truck.id}
                    truck={truck}
                    onEdit={isAdmin ? openEdit : undefined}
                    onDelete={isAdmin ? handleDelete : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <TruckFormModal
          open={showModal}
          editing={editing}
          saving={saving}
          garages={data?.garages ?? []}
          trailers={data?.trailers ?? []}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSave}
        />
      </div>
    </Layout>
  );
}
