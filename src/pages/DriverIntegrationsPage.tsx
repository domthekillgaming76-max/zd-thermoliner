import { Plug, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { IntegrationProviderCard } from '../components/integrations/IntegrationProviderCard';
import { useDriverIntegrations } from '../hooks/useDriverIntegrations';
import { INTEGRATION_PROVIDERS } from '../lib/integrationTypes';
import { fmtDateTime, fmtEuro } from '../lib/format';

export function DriverIntegrationsPage() {
  const {
    deliveries,
    logs,
    loading,
    syncing,
    error,
    getIntegration,
    connect,
    disconnect,
    syncOne,
    syncAll,
    importFile,
  } = useDriverIntegrations();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div
          className="erp-card rounded-2xl p-6 border border-red-500/15"
          style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(0,0,0,0.35))' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Plug className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Intégrations Chauffeurs</h1>
                <p className="text-sm text-white/50 mt-1 max-w-xl">
                  Connectez TrucksBook, World of Trucks, TruckersMP ou Discord.
                  Vos livraisons créent automatiquement des feuilles de route et créditent votre banque RP.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={syncing === 'all'}
              onClick={() => void syncAll()}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing === 'all' ? 'animate-spin' : ''}`} />
              Tout synchroniser
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-white/45 py-10 text-center">Chargement des intégrations…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {INTEGRATION_PROVIDERS.map((config) => {
              const integration = getIntegration(config.id);
              return (
                <IntegrationProviderCard
                  key={config.id}
                  config={config}
                  integration={integration}
                  syncing={syncing === integration?.id}
                  onConnect={connect}
                  onDisconnect={disconnect}
                  onSync={syncOne}
                  onImport={async (file, provider) => { await importFile(file, provider); }}
                />
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="erp-card rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">Livraisons importées récentes</h2>
            {deliveries.length === 0 ? (
              <p className="text-xs text-white/40">Aucune livraison externe pour le moment.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {deliveries.map((d) => (
                  <div key={d.id} className="rounded-lg bg-black/25 px-3 py-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-white/85 font-medium">
                        {d.departure_city ?? '?'} → {d.arrival_city ?? '?'}
                      </span>
                      <span className="text-emerald-400">{fmtEuro(d.income)}</span>
                    </div>
                    <div className="text-white/35 mt-1 flex justify-between">
                      <span>{d.provider} · {Math.round(d.distance_km)} km</span>
                      <span>{d.road_sheet_id ? 'Feuille créée' : d.sync_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="erp-card rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">Historique erreurs / sync</h2>
            {logs.length === 0 ? (
              <p className="text-xs text-white/40">Aucun log de synchronisation.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-lg bg-black/25 px-3 py-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-white/80">{log.provider ?? '—'}</span>
                      <span className={log.status === 'error' ? 'text-red-400' : 'text-white/40'}>
                        {fmtDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-white/45 mt-1">{log.message ?? log.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
