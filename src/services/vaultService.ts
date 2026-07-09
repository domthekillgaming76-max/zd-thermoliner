import { supabase } from '../lib/supabase';
import { safeUuid } from '../lib/safeUuid';
import { canApproveVaultDocuments } from '../lib/vaultPermissions';
import type {
  VaultAlert,
  VaultAuditAction,
  VaultBundle,
  VaultCategory,
  VaultDashboard,
  VaultDocument,
  VaultReminderType,
  VaultUploadInput,
} from '../lib/vaultTypes';
import { effectiveDocumentStatus } from '../lib/vaultTypes';
import { fetchDriverByUserId } from './roadSheetService';

const BUCKET = 'documents';
const SIGNED_URL_TTL = 3600;

function isVaultSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

async function logAudit(
  documentId: string | null,
  userId: string,
  action: VaultAuditAction,
  details: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('document_audit_logs').insert({
    document_id: documentId,
    user_id: userId,
    action,
    details,
  });
  if (error && !isVaultSchemaError(error)) {
    console.error('[Z&D Vault] audit log error:', error);
  }
}

async function createSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error) {
    console.error('[Z&D Vault] signed URL error:', error);
    return null;
  }
  return data.signedUrl;
}

function buildDashboard(docs: VaultDocument[], categories: VaultCategory[]): VaultDashboard {
  const now = Date.now();
  const in30 = now + 30 * 24 * 60 * 60 * 1000;

  const byCategoryMap = new Map<string, number>();
  let expiringSoon = 0;
  let expired = 0;
  let pendingValidation = 0;
  let storageBytes = 0;

  for (const doc of docs) {
    const status = effectiveDocumentStatus(doc);
    storageBytes += Number(doc.file_size_bytes ?? 0);
    byCategoryMap.set(doc.category_key, (byCategoryMap.get(doc.category_key) ?? 0) + 1);

    if (status === 'pending') pendingValidation += 1;
    if (status === 'expired') expired += 1;
    if (doc.expires_at) {
      const exp = new Date(doc.expires_at).getTime();
      if (exp > now && exp <= in30 && status !== 'rejected') expiringSoon += 1;
    }
  }

  const byCategory = categories
    .map(c => ({ key: c.key, label: c.label, count: byCategoryMap.get(c.key) ?? 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalDocuments: docs.length,
    expiringSoon,
    expired,
    pendingValidation,
    storageBytes,
    byCategory,
  };
}

function buildAlerts(docs: VaultDocument[], categories: VaultCategory[]): VaultAlert[] {
  const alerts: VaultAlert[] = [];
  const now = Date.now();
  const in7 = now + 7 * 24 * 60 * 60 * 1000;
  const in30 = now + 30 * 24 * 60 * 60 * 1000;

  for (const doc of docs) {
    const status = effectiveDocumentStatus(doc);
    const cat = categories.find(c => c.key === doc.category_key);

    if (doc.expires_at) {
      const exp = new Date(doc.expires_at).getTime();
      if (exp < now && status !== 'rejected') {
        alerts.push({
          id: `expired-${doc.id}`,
          type: 'expired',
          message: `${cat?.label ?? doc.title} — expiré le ${new Date(doc.expires_at).toLocaleDateString('fr-FR')}`,
          categoryKey: doc.category_key,
          ownerType: doc.owner_type,
          ownerId: doc.owner_id,
          documentId: doc.id,
          severity: 'danger',
        });
      } else if (exp <= in7 && exp > now) {
        alerts.push({
          id: `exp7-${doc.id}`,
          type: 'expiring_7',
          message: `${cat?.label ?? doc.title} — expire dans moins de 7 jours`,
          categoryKey: doc.category_key,
          ownerType: doc.owner_type,
          ownerId: doc.owner_id,
          documentId: doc.id,
          severity: 'danger',
        });
      } else if (exp <= in30 && exp > in7) {
        alerts.push({
          id: `exp30-${doc.id}`,
          type: 'expiring_30',
          message: `${cat?.label ?? doc.title} — expire dans moins de 30 jours`,
          categoryKey: doc.category_key,
          ownerType: doc.owner_type,
          ownerId: doc.owner_id,
          documentId: doc.id,
          severity: 'warning',
        });
      }
    }
  }

  const requiredByOwner = new Map<string, Set<string>>();
  for (const doc of docs) {
    const key = `${doc.owner_type}:${doc.owner_id ?? 'global'}`;
    const set = requiredByOwner.get(key) ?? new Set<string>();
    set.add(doc.category_key);
    requiredByOwner.set(key, set);
  }

  for (const [ownerKey, present] of requiredByOwner) {
    const [ownerType, ownerIdRaw] = ownerKey.split(':');
    const ownerId = ownerIdRaw === 'global' ? null : ownerIdRaw;
    const requiredCats = categories.filter(
      c => c.is_required && c.owner_type === ownerType,
    );
    for (const cat of requiredCats) {
      if (!present.has(cat.key)) {
        alerts.push({
          id: `missing-${ownerKey}-${cat.key}`,
          type: 'missing_required',
          message: `${cat.label} manquant (${ownerType})`,
          categoryKey: cat.key,
          ownerType: ownerType as VaultAlert['ownerType'],
          ownerId,
          severity: 'warning',
        });
      }
    }
  }

  return alerts.slice(0, 30);
}

async function enrichDocuments(
  docs: VaultDocument[],
  categories: VaultCategory[],
): Promise<VaultDocument[]> {
  const catMap = new Map(categories.map(c => [c.key, c.label]));
  const driverIds = [...new Set(docs.filter(d => d.owner_type === 'driver' && d.owner_id).map(d => d.owner_id!))];
  const truckIds = [...new Set(docs.filter(d => d.owner_type === 'truck' && d.owner_id).map(d => d.owner_id!))];

  const [driversRes, trucksRes] = await Promise.all([
    driverIds.length
      ? supabase.from('drivers').select('id, name').in('id', driverIds)
      : Promise.resolve({ data: [] }),
    truckIds.length
      ? supabase.from('trucks').select('id, registration, brand, model').in('id', truckIds)
      : Promise.resolve({ data: [] }),
  ]);

  const driverMap = new Map((driversRes.data ?? []).map(d => [d.id as string, d.name as string]));
  const truckMap = new Map(
    (trucksRes.data ?? []).map(t => [
      t.id as string,
      [t.brand, t.model, t.registration].filter(Boolean).join(' '),
    ]),
  );

  return docs.map(doc => ({
    ...doc,
    category_label: catMap.get(doc.category_key) ?? doc.category_key,
    owner_label:
      doc.owner_type === 'driver' && doc.owner_id
        ? driverMap.get(doc.owner_id) ?? null
        : doc.owner_type === 'truck' && doc.owner_id
          ? truckMap.get(doc.owner_id) ?? null
          : doc.owner_type === 'company'
            ? 'Z&D Thermoliner'
            : null,
    status: effectiveDocumentStatus(doc),
  }));
}

export async function fetchVaultBundle(
  userId: string,
  role?: string | null,
  email?: string | null,
): Promise<VaultBundle> {
  const { error: probe } = await supabase.from('documents').select('id').limit(1);
  const migrationRequired = !!probe && isVaultSchemaError(probe);

  if (migrationRequired) {
    return {
      dashboard: {
        totalDocuments: 0,
        expiringSoon: 0,
        expired: 0,
        pendingValidation: 0,
        storageBytes: 0,
        byCategory: [],
      },
      categories: [],
      documents: [],
      alerts: [],
      migrationRequired: true,
    };
  }

  const [categoriesRes, documentsRes] = await Promise.all([
    supabase.from('document_categories').select('*').order('sort_order'),
    supabase.from('documents').select('*').order('created_at', { ascending: false }),
  ]);

  if (categoriesRes.error && !isVaultSchemaError(categoriesRes.error)) throw categoriesRes.error;
  if (documentsRes.error && !isVaultSchemaError(documentsRes.error)) throw documentsRes.error;

  const categories = (categoriesRes.data ?? []) as VaultCategory[];
  let documents = await enrichDocuments((documentsRes.data ?? []) as VaultDocument[], categories);

  const driver = await fetchDriverByUserId(userId);
  const isDriverOnly =
    (role === 'chauffeur' || role === 'tractionnaire') && !canApproveVaultDocuments(role, email);
  if (isDriverOnly && driver) {
    documents = documents.filter(d => d.owner_type === 'driver' && d.owner_id === driver.id);
  }

  const dashboard = buildDashboard(documents, categories);
  const alerts = buildAlerts(documents, categories);

  return { dashboard, categories, documents, alerts, migrationRequired: false };
}

export async function uploadVaultDocument(
  userId: string,
  input: VaultUploadInput,
): Promise<VaultDocument> {
  const category = await supabase
    .from('document_categories')
    .select('id, key, is_required')
    .eq('key', input.categoryKey)
    .maybeSingle();

  if (category.error) throw category.error;
  if (!category.data) throw new Error('Catégorie introuvable.');

  const docId = safeUuid();
  const ext = input.file.name.split('.').pop() ?? 'bin';
  const ownerSegment = input.ownerId ?? 'global';
  const storagePath = `${input.ownerType}/${ownerSegment}/${docId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.file, { upsert: false, contentType: input.file.type });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      id: docId,
      category_id: category.data.id,
      category_key: input.categoryKey,
      title: input.title.trim() || input.file.name,
      file_name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      file_size_bytes: input.file.size,
      owner_type: input.ownerType,
      owner_id: input.ownerId ?? null,
      expires_at: input.expiresAt ?? null,
      status: 'pending',
      uploaded_by: userId,
      notes: input.notes ?? null,
      is_required: category.data.is_required ?? false,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  await logAudit(docId, userId, 'upload', { file_name: input.file.name, category: input.categoryKey });
  return data as VaultDocument;
}

export async function replaceVaultDocument(
  userId: string,
  documentId: string,
  file: File,
): Promise<VaultDocument> {
  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Document introuvable.');

  const ext = file.name.split('.').pop() ?? 'bin';
  const ownerSegment = existing.owner_id ?? 'global';
  const storagePath = `${existing.owner_type}/${ownerSegment}/${documentId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  if (existing.storage_path !== storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path as string]);
  }

  const { data, error } = await supabase
    .from('documents')
    .update({
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select('*')
    .single();

  if (error) throw error;

  await logAudit(documentId, userId, 'replace', { file_name: file.name });
  return data as VaultDocument;
}

export async function deleteVaultDocument(userId: string, documentId: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Document introuvable.');

  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) throw error;

  await supabase.storage.from(BUCKET).remove([existing.storage_path as string]);
  await logAudit(documentId, userId, 'delete', {});
}

export async function approveVaultDocument(
  userId: string,
  documentId: string,
  role?: string | null,
  email?: string | null,
): Promise<void> {
  if (!canApproveVaultDocuments(role, email)) {
    throw new Error('Seuls les administrateurs peuvent approuver des documents.');
  }

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;
  await logAudit(documentId, userId, 'approve', {});
}

export async function rejectVaultDocument(
  userId: string,
  documentId: string,
  reason: string,
  role?: string | null,
  email?: string | null,
): Promise<void> {
  if (!canApproveVaultDocuments(role, email)) {
    throw new Error('Seuls les administrateurs peuvent rejeter des documents.');
  }

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'rejected',
      rejection_reason: reason.slice(0, 500),
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;
  await logAudit(documentId, userId, 'reject', { reason });
}

export async function getVaultDocumentSignedUrl(
  userId: string,
  document: VaultDocument,
  action: 'preview' | 'download' = 'preview',
): Promise<string> {
  const url = await createSignedUrl(document.storage_path);
  if (!url) throw new Error('Impossible de générer le lien sécurisé.');

  await logAudit(document.id, userId, action === 'download' ? 'download' : 'preview', {
    file_name: document.file_name,
  });

  return url;
}

export async function fetchVaultOwners(
  ownerType: VaultDocument['owner_type'],
): Promise<{ id: string; label: string }[]> {
  switch (ownerType) {
    case 'driver': {
      const { data } = await supabase.from('drivers').select('id, name').order('name');
      return (data ?? []).map(d => ({ id: d.id as string, label: d.name as string }));
    }
    case 'truck': {
      const { data } = await supabase.from('trucks').select('id, registration, brand, model').order('registration');
      return (data ?? []).map(t => ({
        id: t.id as string,
        label: [t.brand, t.model, t.registration].filter(Boolean).join(' '),
      }));
    }
    case 'trailer': {
      const { data } = await supabase.from('trailers').select('id, registration, type').order('registration');
      return (data ?? []).map(t => ({
        id: t.id as string,
        label: `${t.type} (${t.registration})`,
      }));
    }
    case 'client': {
      const { data } = await supabase.from('clients').select('id, name').order('name');
      return (data ?? []).map(c => ({ id: c.id as string, label: c.name as string }));
    }
    default:
      return [{ id: 'company', label: 'Z&D Thermoliner' }];
  }
}

export type { VaultReminderType };
