import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Globe,
  MessageCircle,
  Radio,
  RefreshCw,
  Truck,
  Upload,
} from 'lucide-react';
import type { DriverIntegration, IntegrationProvider, ProviderConfig } from '../../lib/integrationTypes';
import { fmtDateTime } from '../../lib/format';

const PROVIDER_ICONS: Record<IntegrationProvider, typeof Truck> = {
  trucksbook: Truck,
  world_of_trucks: Globe,
  truckersmp: Radio,
  discord: MessageCircle,
};

interface IntegrationProviderCardProps {
  config: ProviderConfig;
  integration: DriverIntegration | null;
  syncing: boolean;
  onConnect: (provider: IntegrationProvider, fields: Record<string, string>) => Promise<void>;
  onDisconnect: (integrationId: string) => Promise<void>;
  onSync: (integration: DriverIntegration) => Promise<void>;
  onImport: (file: File, provider: IntegrationProvider) => Promise<void>;
}

export function IntegrationProviderCard({
  config,
  integration,
  syncing,
  onConnect,
  onDisconnect,
  onSync,
  onImport,
}: IntegrationProviderCardProps) {
  const Icon = PROVIDER_ICONS[config.id];
  const fileRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  const isConnected = integration?.status === 'connected' || integration?.status === 'pending';
  const statusLabel = integration?.status === 'connected'
    ? 'Connecté'
    : integration?.status === 'pending'
      ? 'En attente API'
      : integration?.status === 'error'
        ? 'Erreur'
        : 'Non connecté';

  const statusColor = integration?.status === 'connected'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
    : integration?.status === 'error'
      ? 'text-red-400 bg-red-500/10 border-red-500/25'
      : integration?.status === 'pending'
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
        : 'text-white/45 bg-white/5 border-white/10';

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const payload: Record<string, string> = {};
      for (const field of config.connectFields) {
        payload[field.key] = fields[field.key] ?? '';
      }
      await onConnect(config.id, payload);
      setShowConnect(false);
      setFields({});
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="erp-card rounded-2xl p-5 border border-white/8 hover:border-red-500/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-red-500/12 border border-red-500/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">{config.label}</h3>
            <p className="text-xs text-white/45 mt-1">{config.description}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {integration && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-black/25 px-3 py-2">
            <p className="text-white/35">Identifiant externe</p>
            <p className="text-white/80 mt-0.5 truncate">
              {integration.external_username || integration.external_user_id || '—'}
            </p>
          </div>
          <div className="rounded-lg bg-black/25 px-3 py-2">
            <p className="text-white/35">Dernière sync</p>
            <p className="text-white/80 mt-0.5">
              {integration.last_sync_at ? fmtDateTime(integration.last_sync_at) : 'Jamais'}
            </p>
          </div>
        </div>
      )}

      {integration?.last_error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-300/90 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{integration.last_error}</span>
        </div>
      )}

      {!config.apiAvailable && config.pendingMessage && (
        <div className="mt-3 text-xs text-amber-200/80 bg-amber-500/8 border border-amber-500/15 rounded-lg px-3 py-2">
          {config.pendingMessage}
        </div>
      )}

      {showConnect && (
        <div className="mt-4 space-y-2">
          {config.connectFields.map((field) => (
            <input
              key={field.key}
              type="text"
              placeholder={field.placeholder}
              value={fields[field.key] ?? ''}
              onChange={(e) => setFields(prev => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={() => setShowConnect(v => !v)}
            className="btn-primary px-3 py-2 rounded-lg text-xs font-semibold"
          >
            {showConnect ? 'Annuler' : 'Connecter'}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={syncing}
              onClick={() => integration && onSync(integration)}
              className="btn-primary px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Synchroniser
            </button>
            <button
              type="button"
              onClick={() => integration && onDisconnect(integration.id)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/8"
            >
              Déconnecter
            </button>
          </>
        )}

        {(!config.apiAvailable || config.id === 'trucksbook' || config.id === 'world_of_trucks') && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImport(file, config.id);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white/70 hover:text-white border border-white/10 hover:border-red-500/30 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Importer CSV/JSON
            </button>
          </>
        )}

        {showConnect && (
          <button
            type="button"
            disabled={connecting}
            onClick={() => void handleConnect()}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Valider
          </button>
        )}
      </div>
    </div>
  );
}
