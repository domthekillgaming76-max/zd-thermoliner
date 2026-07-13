import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Container, Link2, Plus, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { FreightAcceptModal } from '../components/freight/FreightAcceptModal';
import { FreightChainAcceptModal } from '../components/freight/FreightChainAcceptModal';
import { FreightChainCard } from '../components/freight/FreightChainCard';
import { FreightChainFormModal } from '../components/freight/FreightChainFormModal';
import { FreightDashboardPanel } from '../components/freight/FreightDashboardPanel';
import { FreightFiltersBar, type FreightFilters } from '../components/freight/FreightFiltersBar';
import { FreightOfferCard } from '../components/freight/FreightOfferCard';
import { FreightOfferFormModal } from '../components/freight/FreightOfferFormModal';
import { FreightMarketGallery, FreightHeroBanner } from '../components/freight/FreightMarketGallery';
import { useAuth } from '../contexts/AuthContext';
import { useFreight } from '../hooks/useFreight';
import {
  canAccessFreightMarket,
  canAdminFreightOffers,
  canManageFreightOffers,
  isFreightDriverUser,
} from '../lib/freightPermissions';
import type { FreightChain, FreightOffer, FreightOfferInput } from '../lib/freightTypes';
import { filterFreightOffers } from '../lib/freightTypes';
import { fetchDriverByUserId } from '../services/roadSheetService';

export function FreightMarketPage() {
  const { user, profile } = useAuth();
  const email = user?.email ?? profile?.email;
  const role = profile?.role;

  const canAccess = canAccessFreightMarket(role, email);
  const canManage = canManageFreightOffers(role, email);
  const canAdmin = canAdminFreightOffers(role, email);
  const isDriver = isFreightDriverUser(role, email);

  const [filters, setFilters] = useState<FreightFilters>({ search: '', filter: 'all', clientId: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [chainFormOpen, setChainFormOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [chainAcceptOpen, setChainAcceptOpen] = useState(false);
  const [editing, setEditing] = useState<FreightOffer | null>(null);
  const [accepting, setAccepting] = useState<FreightOffer | null>(null);
  const [acceptingChain, setAcceptingChain] = useState<FreightChain | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<'market' | 'assigned'>('market');

  const {
    data, isLoading, isFetching, isError, error, refetch,
    create, update, remove, duplicate, cancel, accept, request,
    createChain, acceptChain, completeLeg, cancelChain,
  } = useFreight(user?.id, role, email);

  const filteredChains = useMemo(() => {
    const chains = data?.chains ?? [];
    const q = filters.search.trim().toLowerCase();
    let list = chains.filter(c => c.status !== 'cancelled');
    if (filters.clientId) {
      list = list.filter(c => c.client_id === filters.clientId);
    }
    if (q) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.client_name ?? '').toLowerCase().includes(q) ||
        c.legs.some(l => l.departure_city.toLowerCase().includes(q) || l.arrival_city.toLowerCase().includes(q)),
      );
    }
    if (filters.filter === 'urgent') list = list.filter(c => c.priority === 'urgent');
    if (filters.filter === 'long_distance') list = list.filter(c => c.total_distance_km >= 800);
    if (filters.filter === 'short_distance') list = list.filter(c => c.total_distance_km < 300);
    if (filters.filter === 'high_value') list = list.filter(c => c.total_revenue >= 5000);
    if (filters.filter === 'best_profit') {
      list.sort((a, b) => b.total_net_profit - a.total_net_profit);
    }
    return list;
  }, [data?.chains, filters]);

  useEffect(() => {
    if (!user?.id || !isDriver) return;
    fetchDriverByUserId(user.id).then(d => setDriverId(d?.id ?? null));
  }, [user?.id, isDriver]);

  const unfilteredOffers = useMemo(() => {
    const offers = data?.offers ?? [];
    return offers.filter(o => o.status === 'available' || o.status === 'reserved' || (!isDriver && o.status !== 'cancelled'));
  }, [data?.offers, isDriver]);

  const filtered = useMemo(() => {
    if (filters.filter === 'chained') return [];
    const offers = data?.offers ?? [];
    const list = filterFreightOffers(offers, filters);
    if (!isDriver || tab === 'market') {
      return list.filter(o => o.status === 'available' || o.status === 'reserved' || (!isDriver && o.status !== 'cancelled'));
    }
    return list.filter(o => ['assigned', 'in_progress', 'delivered'].includes(o.status));
  }, [data?.offers, filters, isDriver, tab]);

  const busy =
    create.isPending || update.isPending || remove.isPending ||
    duplicate.isPending || cancel.isPending || accept.isPending || request.isPending ||
    createChain.isPending || acceptChain.isPending || completeLeg.isPending || cancelChain.isPending;

  const showChains = filters.filter === 'chained' || filteredChains.length > 0 && filters.filter === 'all';
  const hasContent = filtered.length > 0 || (showChains && filteredChains.length > 0);
  const filterHidesResults = !hasContent && filters.filter !== 'all' && unfilteredOffers.length > 0;

  if (!canAccess) {
    return (
      <Navigate
        to="/wall"
        replace
        state={{ accessDenied: 'Accès réservé — marché fret fermé aux visiteurs.' }}
      />
    );
  }

  async function handleCreate(input: FreightOfferInput) {
    setPageError(null);
    try {
      await create.mutateAsync(input);
      setFormOpen(false);
      setSuccessMessage('Offre fret publiée.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur création offre.');
    }
  }

  async function handleUpdate(input: FreightOfferInput) {
    if (!editing) return;
    setPageError(null);
    try {
      await update.mutateAsync({ id: editing.id, input });
      setFormOpen(false);
      setEditing(null);
      setSuccessMessage('Offre mise à jour.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur mise à jour.');
    }
  }

  async function handleAccept(assign: { driverId?: string; truckId?: string; trailerId?: string; sendToGame?: boolean }) {
    if (!accepting) return;
    setPageError(null);
    try {
      const result = await accept.mutateAsync({
        offerId: accepting.id,
        driverId: assign.driverId ?? null,
        truckId: assign.truckId ?? null,
        trailerId: assign.trailerId ?? null,
        sendToGame: assign.sendToGame,
      });
      setAcceptOpen(false);
      setAccepting(null);
      setSuccessMessage(
        assign.sendToGame
          ? `Mission créée${result.roadSheetId ? ' + feuille de route brouillon' : ''} et envoyée au launcher ETS2.`
          : `Mission créée${result.roadSheetId ? ' + feuille de route brouillon' : ''}.`,
      );
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur acceptation.');
    }
  }

  async function handleRequest(offerId: string) {
    if (!driverId) {
      setPageError('Profil chauffeur non lié — contactez le dispatch.');
      return;
    }
    setPageError(null);
    try {
      await request.mutateAsync({ offerId, driverId });
      setSuccessMessage('Demande envoyée au dispatch.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur demande.');
    }
  }

  async function handleRefresh() {
    setPageError(null);
    const result = await refetch();
    if (result.error) {
      setPageError(result.error instanceof Error ? result.error.message : 'Erreur actualisation.');
      return;
    }
    const count = (result.data?.offers.length ?? 0) + (result.data?.chains.length ?? 0);
    setSuccessMessage(
      count > 0
        ? `${count} offre${count > 1 ? 's' : ''} chargée${count > 1 ? 's' : ''}.`
        : 'Aucune offre — créez-en une ou vérifiez les migrations.',
    );
  }

  return (
    <Layout>
      <div className="freight-module space-y-6 pb-24 md:pb-8">
        <div className="freight-hero rounded-2xl p-4 md:p-6 border border-cyan-500/10 bg-gradient-to-br from-cyan-500/5 via-transparent to-red-500/5">
          <FreightHeroBanner />
          <PageHeader
            icon={Container}
            title="Marché Fret"
            subtitle="Tableau dispatch — offres, rentabilité & missions automatiques"
            actions={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="erp-btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Chargement…' : 'Actualiser'}
                </button>
                {canAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditing(null); setFormOpen(true); }}
                      className="erp-btn-primary flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Nouvelle offre
                    </button>
                    <button
                      type="button"
                      onClick={() => setChainFormOpen(true)}
                      className="erp-btn-secondary flex items-center gap-2 text-sm border-cyan-500/30 text-cyan-400"
                    >
                      <Link2 className="w-4 h-4" />
                      Route chaînée
                    </button>
                  </>
                )}
              </div>
            }
          />
        </div>

        <FreightMarketGallery />

        {data?.migrationRequired && (
          <div className="freight-glass rounded-2xl p-4 flex items-start gap-3 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-400 text-sm">Migration requise</p>
              <p className="text-xs text-white/50 mt-1">
                Exécutez <code className="text-white/70">npx supabase db push</code> pour activer le module marché fret (migration 041).
              </p>
            </div>
          </div>
        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur chargement fret.'} />}

        <FreightDashboardPanel dashboard={data?.dashboard ?? {
          availableOffers: 0, highValueContracts: 0, urgentDeliveries: 0,
          refrigeratedFreight: 0, adrFreight: 0, longDistanceJobs: 0,
          bestProfitPerKm: 0, expiringOffers: 0,
        }} loading={isLoading} />

        {isDriver && (
          <div className="flex gap-2">
            {(['market', 'assigned'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  tab === t
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-white/5 text-white/40 border-white/8'
                }`}
              >
                {t === 'market' ? 'Offres disponibles' : 'Mes missions'}
              </button>
            ))}
          </div>
        )}

        <FreightFiltersBar
          filters={filters}
          clients={data?.clients ?? []}
          onChange={setFilters}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="freight-offer-card rounded-2xl h-64 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : !hasContent ? (
          <div className="freight-glass rounded-2xl p-12 text-center">
            <Container className="w-12 h-12 text-white/15 mx-auto mb-3" />
            <p className="text-white/50 font-semibold">Aucune offre fret</p>
            <p className="text-xs text-white/30 mt-1">
              {filterHidesResults
                ? 'Aucune offre pour ce filtre — essayez « Toutes ».'
                : canAdmin
                  ? 'Créez une offre, une route chaînée ou modifiez les filtres.'
                  : 'Revenez plus tard ou changez les filtres.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(filters.filter === 'all' || filters.filter === 'chained') && filteredChains.map(chain => (
              <FreightChainCard
                key={chain.id}
                chain={chain}
                canManage={canManage}
                busy={busy}
                onAccept={() => { setAcceptingChain(chain); setChainAcceptOpen(true); }}
                onCompleteLeg={async () => {
                  setPageError(null);
                  try {
                    await completeLeg.mutateAsync({ chainId: chain.id, legOrder: chain.current_leg_order });
                    setSuccessMessage(`Étape ${chain.current_leg_order} validée — prochaine étape débloquée.`);
                  } catch (err) {
                    setPageError(err instanceof Error ? err.message : 'Erreur validation étape.');
                  }
                }}
                onCancel={async () => {
                  if (!confirm('Annuler ce tour chaîné ?')) return;
                  setPageError(null);
                  try {
                    await cancelChain.mutateAsync(chain.id);
                    setSuccessMessage('Tour chaîné annulé.');
                  } catch (err) {
                    setPageError(err instanceof Error ? err.message : 'Erreur annulation.');
                  }
                }}
              />
            ))}
            {filters.filter !== 'chained' && filtered.map(offer => (
              <FreightOfferCard
                key={offer.id}
                offer={offer}
                canManage={canManage}
                canAdmin={canAdmin}
                isDriver={isDriver}
                busy={busy}
                onAccept={() => { setAccepting(offer); setAcceptOpen(true); }}
                onRequest={() => handleRequest(offer.id)}
                onEdit={canAdmin ? () => { setEditing(offer); setFormOpen(true); } : undefined}
                onDuplicate={canAdmin ? async () => {
                  setPageError(null);
                  try {
                    await duplicate.mutateAsync(offer.id);
                    setSuccessMessage('Offre dupliquée.');
                  } catch (err) {
                    setPageError(err instanceof Error ? err.message : 'Erreur duplication.');
                  }
                } : undefined}
                onCancel={canAdmin ? async () => {
                  if (!confirm('Annuler cette offre ?')) return;
                  setPageError(null);
                  try {
                    await cancel.mutateAsync(offer.id);
                    setSuccessMessage('Offre annulée.');
                  } catch (err) {
                    setPageError(err instanceof Error ? err.message : 'Erreur annulation.');
                  }
                } : undefined}
                onDelete={canAdmin ? async () => {
                  if (!confirm('Supprimer définitivement cette offre ?')) return;
                  setPageError(null);
                  try {
                    await remove.mutateAsync(offer.id);
                    setSuccessMessage('Offre supprimée.');
                  } catch (err) {
                    setPageError(err instanceof Error ? err.message : 'Erreur suppression.');
                  }
                } : undefined}
              />
            ))}
          </div>
        )}

        <FreightOfferFormModal
          open={formOpen}
          editing={editing}
          clients={data?.clients ?? []}
          saving={create.isPending || update.isPending}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={editing ? handleUpdate : handleCreate}
        />

        <FreightChainFormModal
          open={chainFormOpen}
          clients={data?.clients ?? []}
          saving={createChain.isPending}
          onClose={() => setChainFormOpen(false)}
          onSubmit={async input => {
            setPageError(null);
            try {
              await createChain.mutateAsync(input);
              setChainFormOpen(false);
              setSuccessMessage(`Tour chaîné créé — ${input.legs.length} étapes.`);
            } catch (err) {
              setPageError(err instanceof Error ? err.message : 'Erreur création chaîne.');
            }
          }}
        />

        <FreightChainAcceptModal
          open={chainAcceptOpen}
          chain={acceptingChain}
          drivers={data?.drivers ?? []}
          trucks={data?.trucks ?? []}
          trailers={data?.trailers ?? []}
          saving={acceptChain.isPending}
          onClose={() => { setChainAcceptOpen(false); setAcceptingChain(null); }}
          onAccept={async assign => {
            if (!acceptingChain) return;
            setPageError(null);
            try {
              const result = await acceptChain.mutateAsync({
                chainId: acceptingChain.id,
                driverId: assign.driverId ?? null,
                truckId: assign.truckId ?? null,
                trailerId: assign.trailerId ?? null,
              });
              setChainAcceptOpen(false);
              setAcceptingChain(null);
              setSuccessMessage(`${result.missionIds.length} missions créées pour le tour chaîné.`);
            } catch (err) {
              setPageError(err instanceof Error ? err.message : 'Erreur acceptation chaîne.');
            }
          }}
        />

        <FreightAcceptModal
          open={acceptOpen}
          offer={accepting}
          drivers={data?.drivers ?? []}
          trucks={data?.trucks ?? []}
          trailers={data?.trailers ?? []}
          saving={accept.isPending}
          onClose={() => { setAcceptOpen(false); setAccepting(null); }}
          onAccept={handleAccept}
        />
      </div>
    </Layout>
  );
}
