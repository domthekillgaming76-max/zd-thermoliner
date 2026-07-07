import { useMemo, useState } from 'react';
import { Plus, Search, Users, Shield } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { DriverDashboard } from '../components/drivers/DriverDashboard';
import { DriverCard } from '../components/drivers/DriverCard';
import { DriverFormModal } from '../components/drivers/DriverFormModal';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import {
  useCreateDriver,
  useDeleteDriver,
  useDriversModule,
  useUpdateDriver,
} from '../hooks/useDrivers';
import { useAuth } from '../contexts/AuthContext';
import { canManageDrivers } from '../lib/driverPermissions';
import { filterDrivers, DRIVER_FILTERS, type DriverFilterKey } from '../lib/driverFilters';
import type { DriverProfile } from '../lib/driverTypes';
import type { DriverFormInput } from '../services/driverService';

type TabId = 'dashboard' | 'drivers';

export function DriversPage() {
  const { profile, user } = useAuth();
  const isAdmin = canManageDrivers(profile?.role, user?.email);
  const [tab, setTab] = useState<TabId>('dashboard');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DriverFilterKey>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DriverProfile | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useDriversModule();
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const deleteMutation = useDeleteDriver();

  const truckMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of data?.trucks ?? []) {
      m.set(t.id, `${t.registration} ${t.brand ?? ''}`.trim());
    }
    return m;
  }, [data?.trucks]);

  const filtered = useMemo(
    () => filterDrivers(data?.drivers ?? [], search, filter, truckMap),
    [data?.drivers, search, filter, truckMap],
  );

  function openAdd() {
    if (!isAdmin) return;
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(driver: DriverProfile) {
    if (!isAdmin) return;
    setEditing(driver);
    setShowModal(true);
  }

  async function handleSave(input: DriverFormInput) {
    if (!isAdmin) return;
    setPageError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
        setSuccessMessage('Chauffeur mis à jour.');
      } else {
        await createMutation.mutateAsync(input);
        setSuccessMessage('Chauffeur ajouté.');
      }
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm('Supprimer ce chauffeur ?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSuccessMessage('Chauffeur supprimé.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  }

  return (
    <Layout>
      <div className="space-y-6 driver-module">
        <PageHeader
          title="Gestion des chauffeurs"
          subtitle="Pilotage flotte, performance et conformité ERP"
          icon={Users}
          actions={
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nom, rôle, pays, camion..."
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
          <div className="flex items-center gap-2 text-xs text-white/40 px-3 py-2 rounded-xl border border-white/5 bg-white/[0.02]">
            <Shield className="w-3.5 h-3.5" />
            Mode consultation — seuls les administrateurs peuvent créer ou modifier.
          </div>
        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur de chargement.'} />}

        <nav className="flex gap-2 flex-wrap">
          {(['dashboard', 'drivers'] as TabId[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'
              }`}
            >
              {t === 'dashboard' ? 'Tableau de bord' : `Chauffeurs (${filtered.length})`}
            </button>
          ))}
        </nav>

        {tab === 'drivers' && (
          <div className="flex gap-1.5 flex-wrap">
            {DRIVER_FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filter === f.key
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-white/35 hover:bg-white/5 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'dashboard' && (
          <DriverDashboard
            drivers={data?.drivers ?? []}
            roadSheets={data?.roadSheets ?? []}
            documents={data?.documents ?? []}
            loading={isLoading}
          />
        )}

        {tab === 'drivers' && (
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="driver-glass h-52 shimmer rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="driver-glass rounded-2xl p-16 text-center">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">Aucun chauffeur trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(driver => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  truckLabel={driver.truck_id ? truckMap.get(driver.truck_id) : undefined}
                  onEdit={isAdmin ? openEdit : undefined}
                  onDelete={isAdmin ? handleDelete : undefined}
                />
              ))}
            </div>
          )
        )}
      </div>

      {isAdmin && (
        <DriverFormModal
          open={showModal}
          editing={editing}
          saving={createMutation.isPending || updateMutation.isPending}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSave}
        />
      )}
    </Layout>
  );
}
