export type IntegrationProvider = 'trucksbook' | 'world_of_trucks' | 'truckersmp' | 'discord';

export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error';

export type ExternalDeliverySyncStatus = 'pending' | 'processed' | 'error' | 'skipped';

export interface DriverIntegration {
  id: string;
  profile_id: string;
  provider: IntegrationProvider;
  external_user_id: string | null;
  external_username: string | null;
  status: IntegrationStatus;
  metadata: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalDelivery {
  id: string;
  profile_id: string;
  integration_id: string | null;
  provider: IntegrationProvider | 'manual';
  external_delivery_id: string;
  departure_city: string | null;
  arrival_city: string | null;
  cargo: string | null;
  distance_km: number;
  income: number;
  fuel_used: number;
  damage_percent: number;
  truck_name: string | null;
  trailer_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  raw_data: Record<string, unknown>;
  sync_status: ExternalDeliverySyncStatus;
  road_sheet_id: string | null;
  salary_credited: boolean;
  salary_amount: number;
  created_at: string;
}

export interface IntegrationSyncLog {
  id: string;
  profile_id: string | null;
  integration_id: string | null;
  provider: string | null;
  status: 'success' | 'error' | 'partial' | 'skipped';
  message: string | null;
  deliveries_imported: number;
  deliveries_skipped: number;
  raw_error: Record<string, unknown> | null;
  created_at: string;
}

export interface ParsedExternalDelivery {
  external_delivery_id: string;
  departure_city?: string;
  arrival_city?: string;
  cargo?: string;
  distance_km?: number;
  income?: number;
  fuel_used?: number;
  damage_percent?: number;
  truck_name?: string;
  trailer_name?: string;
  started_at?: string;
  completed_at?: string;
  raw_data?: Record<string, unknown>;
}

export interface ProviderConfig {
  id: IntegrationProvider;
  label: string;
  description: string;
  apiAvailable: boolean;
  pendingMessage?: string;
  connectFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required?: boolean;
  }>;
}

export const INTEGRATION_PROVIDERS: ProviderConfig[] = [
  {
    id: 'trucksbook',
    label: 'TrucksBook',
    description: 'Suivi des livraisons TrucksBook — API publique en attente.',
    apiAvailable: false,
    pendingMessage:
      'Connexion API TrucksBook en attente. Vous pouvez importer vos livraisons via fichier CSV/JSON.',
    connectFields: [
      { key: 'external_username', label: 'Pseudo TrucksBook', placeholder: 'Votre pseudo TrucksBook', required: true },
    ],
  },
  {
    id: 'world_of_trucks',
    label: 'World of Trucks',
    description: 'Profil World of Trucks — synchronisation via export officiel.',
    apiAvailable: false,
    pendingMessage: 'Importez vos livraisons via export JSON World of Trucks.',
    connectFields: [
      { key: 'external_username', label: 'Nom de profil WoT', placeholder: 'Profil World of Trucks', required: true },
    ],
  },
  {
    id: 'truckersmp',
    label: 'TruckersMP',
    description: 'API officielle TruckersMP v2 — profil joueur public.',
    apiAvailable: true,
    connectFields: [
      { key: 'external_user_id', label: 'Steam ID', placeholder: '76561198XXXXXXXXX', required: true },
    ],
  },
  {
    id: 'discord',
    label: 'Discord',
    description: 'Lier votre compte Discord pour les notifications communauté.',
    apiAvailable: false,
    pendingMessage: 'OAuth Discord sera activé prochainement. Liez votre identifiant pour l\'instant.',
    connectFields: [
      { key: 'external_username', label: 'Discord', placeholder: 'pseudo#0000 ou ID', required: true },
    ],
  },
];

export function getProviderConfig(provider: IntegrationProvider): ProviderConfig {
  return INTEGRATION_PROVIDERS.find(p => p.id === provider)!;
}
