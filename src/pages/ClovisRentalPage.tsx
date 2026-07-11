import { useState } from 'react';
import { KeyRound, AlertTriangle, Truck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { ClovisTruckCard } from '../components/clovis/ClovisTruckCard';
import { ClovisActiveRentalPanel } from '../components/clovis/ClovisActiveRentalPanel';
import { ClovisAgencyInfoPanel } from '../components/clovis/ClovisAgencyInfoPanel';
import { useAuth } from '../contexts/AuthContext';
import { useClovisRental } from '../hooks/useClovisRental';
import { useDriverBank } from '../hooks/useDriverBank';
import { fmtEuro } from '../lib/format';
import { normalizeRole } from '../lib/roleEngine';

export function ClovisRentalPage() {
  const { user, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isLoading, startRental, returnRental } = useClovisRental(user?.id);
  const bank = useDriverBank(user?.id);

  const catalog = data?.catalog ?? [];
  const activeRental = data?.activeRental ?? null;
  const isChauffeur = normalizeRole(profile?.role) === 'chauffeur' || normalizeRole(profile?.role) === 'admin';
  const balance = bank.data?.account?.balance ?? null;

  async function handleRent(catalogId: string, label: string, rate: number) {
    setError(null);
    if (balance !== null && balance < rate) {
      setError(`Solde insuffisant — ${fmtEuro(rate)} requis pour la première journée (solde : ${fmtEuro(balance)}).`);
      return;
    }
    if (!confirm(`Confirmer la location du ${label} à ${fmtEuro(rate)}/jour ?\n\nUn prélèvement de ${fmtEuro(rate)} sera effectué immédiatement.`)) {
      return;
    }
    try {
      const msg = await startRental.mutateAsync(catalogId);
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleReturn() {
    setError(null);
    if (!activeRental) return;
    if (!confirm('Restituer le véhicule à l\'agence Clovis ?\n\nLes prélèvements journaliers seront arrêtés.')) return;
    try {
      const msg = await returnRental.mutateAsync(activeRental.id);
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl">
        <div className="clovis-hero rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-red-500/5 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80 mb-2">
                Agence partenaire Z&amp;D Thermoliner
              </p>
              <PageHeader
                title="Clovis Location"
                subtitle="Location véhicules Renault T — contrat journalier, prélèvement bancaire automatique"
                icon={KeyRound}
              />
            </div>
            {balance !== null && (
              <div className="rounded-xl bg-black/40 border border-white/8 px-4 py-3 text-right shrink-0">
                <p className="text-[10px] text-white/30 uppercase">Solde compte RP</p>
                <p className="text-xl font-black text-emerald-400">{fmtEuro(balance)}</p>
              </div>
            )}
          </div>
        </div>

        {error && <FormAlert message={error} onDismiss={() => setError(null)} />}
        {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

        {data?.migrationRequired && (
          <div className="rounded-xl p-4 flex items-start gap-3 border border-amber-500/25 bg-amber-500/5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">Salon non installé</p>
              <p className="text-xs text-white/45 mt-1">
                Appliquez la migration Supabase <code className="text-amber-300">079_clovis_vehicle_rental</code>
              </p>
            </div>
          </div>
        )}

        {!isChauffeur && (
          <div className="rounded-xl px-4 py-3 text-sm text-amber-400 border border-amber-500/20 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Réservé aux chauffeurs Z&amp;D Thermoliner avec compte bancaire RP actif.
          </div>
        )}

        <div className="grid xl:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            {activeRental && (
              <ClovisActiveRentalPanel
                rental={activeRental}
                charges={data?.recentCharges ?? []}
                returning={returnRental.isPending}
                onReturn={handleReturn}
              />
            )}

            <div className="clovis-agency rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-5">
                <Truck className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">
                  {activeRental ? 'Autres véhicules (indisponibles)' : 'Flotte disponible'}
                </h2>
              </div>

              {isLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-64 shimmer rounded-2xl" />
                  ))}
                </div>
              ) : catalog.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-12">Aucun véhicule au catalogue.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {catalog.map((item, i) => (
                    <div key={item.id} className="opacity-0 animate-dashboard-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}>
                      <ClovisTruckCard
                        item={item}
                        disabled={!isChauffeur || Boolean(activeRental)}
                        renting={startRental.isPending}
                        onRent={() => handleRent(item.id, item.label, item.daily_rate)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ClovisAgencyInfoPanel />
        </div>
      </div>
    </Layout>
  );
}
