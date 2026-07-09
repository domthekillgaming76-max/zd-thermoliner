import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { DriverIntegration, ExternalDelivery, IntegrationSyncLog } from '../lib/integrationTypes';
import { INTEGRATION_PROVIDERS } from '../lib/integrationTypes';
import {
  connectDriverIntegration,
  disconnectDriverIntegration,
  fetchDriverIntegrations,
  fetchExternalDeliveries,
  fetchIntegrationSyncLogs,
} from '../services/integrationService';
import {
  importDeliveriesFromCsv,
  notifyIntegrationConnectedSafe,
  syncDriverIntegration,
  syncDriverIntegrations,
} from '../services/integrationSyncService';
import type { IntegrationProvider } from '../lib/integrationTypes';

export function useDriverIntegrations(targetProfileId?: string) {
  const { user } = useAuth();
  const profileId = targetProfileId ?? user?.id ?? '';
  const [integrations, setIntegrations] = useState<DriverIntegration[]>([]);
  const [deliveries, setDeliveries] = useState<ExternalDelivery[]>([]);
  const [logs, setLogs] = useState<IntegrationSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const [ints, dels, syncLogs] = await Promise.all([
        fetchDriverIntegrations(profileId),
        fetchExternalDeliveries(profileId, 30),
        fetchIntegrationSyncLogs(profileId, 20),
      ]);
      setIntegrations(ints);
      setDeliveries(dels);
      setLogs(syncLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement intégrations');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getIntegration = useCallback(
    (provider: IntegrationProvider) => integrations.find(i => i.provider === provider) ?? null,
    [integrations],
  );

  const connect = useCallback(async (
    provider: IntegrationProvider,
    fields: Record<string, string>,
  ) => {
    if (!profileId) return;
    setError(null);
    await connectDriverIntegration({
      provider,
      externalUserId: fields.external_user_id,
      externalUsername: fields.external_username,
      metadata: { connected_at: new Date().toISOString() },
    });
    const label = INTEGRATION_PROVIDERS.find(p => p.id === provider)?.label ?? provider;
    void notifyIntegrationConnectedSafe(profileId, label);
    await refresh();
  }, [profileId, refresh]);

  const disconnect = useCallback(async (integrationId: string) => {
    setError(null);
    await disconnectDriverIntegration(integrationId);
    await refresh();
  }, [refresh]);

  const syncOne = useCallback(async (integration: DriverIntegration) => {
    if (!profileId) return;
    setSyncing(integration.id);
    setError(null);
    try {
      await syncDriverIntegration(profileId, integration);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur synchronisation');
    } finally {
      setSyncing(null);
    }
  }, [profileId, refresh]);

  const syncAll = useCallback(async () => {
    if (!profileId) return;
    setSyncing('all');
    setError(null);
    try {
      await syncDriverIntegrations(profileId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur synchronisation');
    } finally {
      setSyncing(null);
    }
  }, [profileId, refresh]);

  const importFile = useCallback(async (file: File, provider: IntegrationProvider) => {
    if (!profileId) return;
    setSyncing(`import-${provider}`);
    setError(null);
    try {
      const result = await importDeliveriesFromCsv(profileId, file, provider);
      if (result.errors.length) {
        setError(result.errors.join(' · '));
      }
      await refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur import');
      return null;
    } finally {
      setSyncing(null);
    }
  }, [profileId, refresh]);

  return {
    profileId,
    integrations,
    deliveries,
    logs,
    loading,
    syncing,
    error,
    refresh,
    getIntegration,
    connect,
    disconnect,
    syncOne,
    syncAll,
    importFile,
  };
}
