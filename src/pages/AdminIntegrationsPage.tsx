import { RefreshCw, Plug, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import {
  fetchAllDriverIntegrations,
  fetchAllExternalDeliveries,
  fetchIntegrationSyncLogs,
  fetchProfilesForIntegrations,
} from '../services/integrationService';
import { syncDriverIntegration } from '../services/integrationSyncService';
import { useCallback, useEffect, useState } from 'react';
import type { DriverIntegration, ExternalDelivery, IntegrationSyncLog } from '../lib/integrationTypes';
import { fmtDateTime, fmtEuro } from '../lib/format';

export function AdminIntegrationsPage() {
  const [allIntegrations, setAllIntegrations] = useState<DriverIntegration[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<ExternalDelivery[]>([]);
  const [allLogs, setAllLogs] = useState<IntegrationSyncLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ints, dels, logs, profs] = await Promise.all([
        fetchAllDriverIntegrations(),
        fetchAllExternalDeliveries(80),
        fetchIntegrationSyncLogs(undefined, 50),
        fetchProfilesForIntegrations(),
      ]);
      setAllIntegrations(ints);
      setAllDeliveries(dels);
      setAllLogs(logs);
      const map: Record<string, string> = {};
      for (const p of profs) {
        map[p.id] = p.pseudo || p.full_name || p.email || p.id.slice(0, 8);
      }
      setProfiles(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resync = async (integration: DriverIntegration) => {
    setSyncingId(integration.id);
    try {
      await syncDriverIntegration(integration.profile_id, integration);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sync');
    } finally {
      setSyncingId(null);
    }
  };

  const connectedCount = allIntegrations.filter(i => i.status === 'connected' || i.status === 'pending').length;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div className="erp-card rounded-2xl p-6 border border-red-500/15">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Plug className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Intégrations chauffeurs</h1>
              <p className="text-sm text-white/50 mt-1">
                {connectedCount} connexion(s) active(s) · {allDeliveries.length} livraison(s) importée(s)
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-white/45 py-8 text-center">Chargement…</div>
        ) : (
          <>
            <div className="erp-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/8">
                <h2 className="text-sm font-bold text-white">Chauffeurs connectés</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/8">
                      <th className="text-left px-4 py-2">Chauffeur</th>
                      <th className="text-left px-4 py-2">Provider</th>
                      <th className="text-left px-4 py-2">Identifiant</th>
                      <th className="text-left px-4 py-2">Statut</th>
                      <th className="text-left px-4 py-2">Dernière sync</th>
                      <th className="text-right px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allIntegrations.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/3">
                        <td className="px-4 py-2.5 text-white/85">{profiles[row.profile_id] ?? row.profile_id.slice(0, 8)}</td>
                        <td className="px-4 py-2.5 text-white/70">{row.provider}</td>
                        <td className="px-4 py-2.5 text-white/55 truncate max-w-[140px]">
                          {row.external_username || row.external_user_id || '—'}
                        </td>
                        <td className="px-4 py-2.5">{row.status}</td>
                        <td className="px-4 py-2.5 text-white/45">
                          {row.last_sync_at ? fmtDateTime(row.last_sync_at) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            disabled={syncingId === row.id}
                            onClick={() => void resync(row)}
                            className="text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === row.id ? 'animate-spin' : ''}`} />
                            Resync
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="erp-card rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-3">Livraisons importées</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {allDeliveries.map((d) => (
                    <div key={d.id} className="rounded-lg bg-black/25 px-3 py-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/80">{profiles[d.profile_id] ?? 'Chauffeur'}</span>
                        <span className="text-emerald-400">{fmtEuro(d.income)}</span>
                      </div>
                      <p className="text-white/45 mt-1">
                        {d.departure_city} → {d.arrival_city} · {d.provider}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="erp-card rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-3">Erreurs récentes</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {allLogs.filter(l => l.status === 'error' || l.status === 'partial').map((log) => (
                    <div key={log.id} className="rounded-lg bg-red-500/8 border border-red-500/15 px-3 py-2 text-xs">
                      <p className="text-white/75">{profiles[log.profile_id ?? ''] ?? '—'} · {log.provider}</p>
                      <p className="text-red-200/80 mt-1">{log.message}</p>
                      <p className="text-white/30 mt-1">{fmtDateTime(log.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
