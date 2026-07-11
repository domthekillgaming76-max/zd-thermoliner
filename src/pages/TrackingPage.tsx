import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Map, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { TrackingAlertsPanel } from '../components/tracking/TrackingAlertsPanel';
import { TrackingDashboardPanel } from '../components/tracking/TrackingDashboardPanel';
import { TrackingDeliveryCard } from '../components/tracking/TrackingDeliveryCard';
import { TrackingDriverPanel } from '../components/tracking/TrackingDriverPanel';
import { TrackingEuropeMap } from '../components/tracking/TrackingEuropeMap';
import { TrackingTimeline } from '../components/tracking/TrackingTimeline';
import { useAuth } from '../contexts/AuthContext';
import { useTracking } from '../hooks/useTracking';
import {
  canAccessTracking,
  canUpdateGpsPosition,
  canViewAllTracking,
} from '../lib/trackingPermissions';
import type { TrackingStatus } from '../lib/trackingTypes';
import { TrackingProvidersBar } from '../components/tracking/TrackingProvidersBar';
import { TrackingGallery, TrackingHeroBanner } from '../components/tracking/TrackingGallery';

export function TrackingPage() {
  const { user, profile } = useAuth();
  const email = user?.email ?? profile?.email;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TrackingStatus>('all');
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canAccess = canAccessTracking(profile?.role, email);
  const viewAll = canViewAllTracking(profile?.role, email);
  const canSimulate = canUpdateGpsPosition(profile?.role, email);

  const { data, isLoading, isError, error, setStatus, setPosition, setProgress, ackAlert } = useTracking(
    user?.id,
    profile?.role,
    email,
  );

  const selected = useMemo(
    () => data?.deliveries.find(d => d.id === selectedId) ?? data?.deliveries[0] ?? null,
    [data, selectedId],
  );

  const filtered = useMemo(() => {
    const list = data?.deliveries ?? [];
    const q = search.trim().toLowerCase();
    return list.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.departure_city.toLowerCase().includes(q) ||
        d.arrival_city.toLowerCase().includes(q) ||
        (d.driver_name ?? '').toLowerCase().includes(q) ||
        (d.truck_label ?? '').toLowerCase().includes(q)
      );
    });
  }, [data?.deliveries, search, statusFilter]);

  const busy = setStatus.isPending || setPosition.isPending || setProgress.isPending;

  if (!canAccess) {
    return (
      <Navigate
        to="/wall"
        replace
        state={{ accessDenied: 'Accès réservé — tracking GPS fermé aux visiteurs.' }}
      />
    );
  }

  async function handleStatusChange(status: TrackingStatus) {
    if (!selected) return;
    setPageError(null);
    try {
      await setStatus.mutateAsync({ trackingId: selected.id, status });
      setSuccessMessage(`Statut mis à jour : ${status}`);
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleMapClick(lat: number, lng: number) {
    if (!canSimulate || !selected) return;
    setPageError(null);
    try {
      await setPosition.mutateAsync({ trackingId: selected.id, lat, lng });
      setSuccessMessage('Position GPS mise à jour.');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleProgressChange(progress: number) {
    if (!canSimulate || !selected) return;
    setPageError(null);
    try {
      await setProgress.mutateAsync({ trackingId: selected.id, progress });
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  return (
    <Layout>
      <div className="space-y-6 tracking-module">
        <PageHeader
          title="GPS & Tracking livraisons"
          subtitle="Salle de contrôle transport — Europe en temps réel (simulation)"
          icon={Map}
        />

        <TrackingHeroBanner />

        {data?.migrationRequired && (
          <div className="tracking-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              Migration 039 requise — exécutez <code className="text-red-300">npx supabase db push</code>
            </p>
          </div>
        )}

        <TrackingProvidersBar />

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={(error as Error)?.message ?? 'Erreur de chargement.'} />}

        {data && (
          <>
            <TrackingDashboardPanel dashboard={data.dashboard} loading={isLoading} />
            <TrackingAlertsPanel
              alerts={data.alerts}
              canAck={viewAll}
              onAcknowledge={id => ackAlert.mutate(id)}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 space-y-4">
                <TrackingEuropeMap
                  deliveries={filtered}
                  markers={data.markers}
                  selectedId={selected?.id}
                  onSelect={setSelectedId}
                  onMapClick={handleMapClick}
                  interactive={canSimulate}
                />

                <div className="tracking-glass rounded-2xl p-3 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      className="erp-input w-full pl-10"
                      placeholder="Rechercher chauffeur, ville, camion..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="erp-select sm:w-48"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                  >
                    <option value="all">Tous statuts</option>
                    <option value="planned">Planifiée</option>
                    <option value="loading">Chargement</option>
                    <option value="on_route">En route</option>
                    <option value="paused">En pause</option>
                    <option value="late">En retard</option>
                    <option value="arrived">Arrivée</option>
                    <option value="delivered">Livrée</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <TrackingDriverPanel
                  delivery={selected}
                  canSimulate={canSimulate}
                  busy={busy}
                  onStatusChange={handleStatusChange}
                  onProgressChange={handleProgressChange}
                />
                <TrackingTimeline entries={data.progressHistory} trackingId={selected?.id} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(d => (
                <TrackingDeliveryCard
                  key={d.id}
                  delivery={d}
                  selected={d.id === selected?.id}
                  onClick={() => setSelectedId(d.id)}
                />
              ))}
            </div>

            <TrackingGallery />
          </>
        )}
      </div>
    </Layout>
  );
}
