export type VaultOwnerType = 'driver' | 'truck' | 'trailer' | 'company' | 'client';

export type VaultDocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type VaultReminderType = 'expiring_30' | 'expiring_7' | 'expired' | 'missing_required';

export type VaultAuditAction =
  | 'upload'
  | 'download'
  | 'delete'
  | 'replace'
  | 'approve'
  | 'reject'
  | 'view'
  | 'preview';

export interface VaultCategory {
  id: string;
  key: string;
  label: string;
  owner_type: VaultOwnerType;
  is_required: boolean;
  sort_order: number;
}

export interface VaultDocument {
  id: string;
  category_id: string | null;
  category_key: string;
  title: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number;
  owner_type: VaultOwnerType;
  owner_id: string | null;
  expires_at: string | null;
  status: VaultDocumentStatus;
  uploaded_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  category_label?: string;
  owner_label?: string | null;
  signed_url?: string | null;
}

export interface VaultDashboard {
  totalDocuments: number;
  expiringSoon: number;
  expired: number;
  pendingValidation: number;
  storageBytes: number;
  byCategory: { key: string; label: string; count: number }[];
}

export interface VaultAlert {
  id: string;
  type: VaultReminderType;
  message: string;
  categoryKey?: string;
  ownerType?: VaultOwnerType;
  ownerId?: string | null;
  documentId?: string | null;
  severity: 'info' | 'warning' | 'danger';
}

export interface VaultBundle {
  dashboard: VaultDashboard;
  categories: VaultCategory[];
  documents: VaultDocument[];
  alerts: VaultAlert[];
  migrationRequired: boolean;
}

export interface VaultUploadInput {
  file: File;
  categoryKey: string;
  title: string;
  ownerType: VaultOwnerType;
  ownerId?: string | null;
  expiresAt?: string | null;
  notes?: string;
}

export const VAULT_OWNER_LABELS: Record<VaultOwnerType, string> = {
  driver: 'Chauffeur',
  truck: 'Camion',
  trailer: 'Remorque',
  company: 'Entreprise',
  client: 'Client',
};

export const VAULT_STATUS_LABELS: Record<VaultDocumentStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  expired: 'Expiré',
};

export const VAULT_STATUS_COLORS: Record<VaultDocumentStatus, string> = {
  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/25',
  expired: 'text-white/45 bg-white/5 border-white/10',
};

export const VAULT_ALERT_LABELS: Record<VaultReminderType, string> = {
  expiring_30: 'Expire dans 30 jours',
  expiring_7: 'Expire dans 7 jours',
  expired: 'Document expiré',
  missing_required: 'Document requis manquant',
};

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

export function effectiveDocumentStatus(doc: VaultDocument): VaultDocumentStatus {
  if (doc.expires_at && new Date(doc.expires_at) < new Date() && doc.status !== 'rejected') {
    return 'expired';
  }
  return doc.status;
}
