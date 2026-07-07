import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Archive, AlertTriangle, Plus, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { VaultAlertsPanel } from '../components/vault/VaultAlertsPanel';
import { VaultDashboardPanel } from '../components/vault/VaultDashboardPanel';
import { VaultDocumentCard } from '../components/vault/VaultDocumentCard';
import { VaultFiltersBar, type VaultFilters } from '../components/vault/VaultFiltersBar';
import { VaultUploadModal } from '../components/vault/VaultUploadModal';
import { useAuth } from '../contexts/AuthContext';
import { useVault } from '../hooks/useVault';
import {
  canAccessVault,
  canApproveVaultDocuments,
  isVaultDriverUser,
} from '../lib/vaultPermissions';
import type { VaultDocument } from '../lib/vaultTypes';
import { fetchDriverByUserId } from '../services/roadSheetService';

export function DocumentsPage() {
  const { user, profile } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [driverOwnerId, setDriverOwnerId] = useState<string | null>(null);
  const [filters, setFilters] = useState<VaultFilters>({
    search: '',
    categoryKey: 'all',
    status: 'all',
    ownerType: 'all',
  });

  const email = user?.email ?? profile?.email;
  const canAccess = canAccessVault(profile?.role, email);
  const canApprove = canApproveVaultDocuments(profile?.role, email);
  const isDriver = isVaultDriverUser(profile?.role, email);

  const {
    data,
    isLoading,
    isError,
    error,
    upload,
    replace,
    remove,
    approve,
    reject,
    signedUrl,
  } = useVault(user?.id, profile?.role, email);

  useEffect(() => {
    if (isDriver && user?.id) {
      fetchDriverByUserId(user.id).then(d => setDriverOwnerId(d?.id ?? null));
    }
  }, [isDriver, user?.id]);

  const filteredDocs = useMemo(() => {
    const docs = data?.documents ?? [];
    const q = filters.search.trim().toLowerCase();
    return docs.filter(doc => {
      if (filters.categoryKey !== 'all' && doc.category_key !== filters.categoryKey) return false;
      if (filters.status !== 'all' && doc.status !== filters.status) return false;
      if (filters.ownerType !== 'all' && doc.owner_type !== filters.ownerType) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        (doc.category_label ?? '').toLowerCase().includes(q) ||
        (doc.owner_label ?? '').toLowerCase().includes(q) ||
        doc.file_name.toLowerCase().includes(q)
      );
    });
  }, [data?.documents, filters]);

  const busy =
    upload.isPending ||
    replace.isPending ||
    remove.isPending ||
    approve.isPending ||
    reject.isPending ||
    signedUrl.isPending;

  if (!canAccess) {
    return <Navigate to="/wall" replace state={{ accessDenied: 'Accès réservé — le coffre-fort numérique est fermé aux visiteurs.' }} />;
  }

  async function handlePreview(doc: VaultDocument) {
    setPageError(null);
    try {
      const url = await signedUrl.mutateAsync({ document: doc, action: 'preview' });
      setPreviewDoc({ ...doc, signed_url: url });
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleDownload(doc: VaultDocument) {
    setPageError(null);
    try {
      const url = await signedUrl.mutateAsync({ document: doc, action: 'download' });
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleDelete(doc: VaultDocument) {
    if (!confirm(`Supprimer « ${doc.title} » ?`)) return;
    setPageError(null);
    try {
      await remove.mutateAsync(doc.id);
      setSuccessMessage('Document supprimé.');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleReplace(doc: VaultDocument, file: File) {
    setPageError(null);
    try {
      await replace.mutateAsync({ documentId: doc.id, file });
      setSuccessMessage('Document remplacé — en attente de validation.');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleApprove(doc: VaultDocument) {
    setPageError(null);
    try {
      await approve.mutateAsync(doc.id);
      setSuccessMessage('Document approuvé.');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleReject(doc: VaultDocument) {
    const reason = prompt('Motif du rejet :');
    if (!reason?.trim()) return;
    setPageError(null);
    try {
      await reject.mutateAsync({ documentId: doc.id, reason });
      setSuccessMessage('Document rejeté.');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleUpload(input: Parameters<typeof upload.mutateAsync>[0]) {
    setPageError(null);
    try {
      await upload.mutateAsync(input);
      setSuccessMessage('Document téléversé — en attente de validation.');
    } catch (err) {
      setPageError((err as Error).message);
      throw err;
    }
  }

  return (
    <Layout>
      <div className="space-y-6 vault-module">
        <PageHeader
          title="Coffre-fort numérique"
          subtitle="Gestion documentaire — chauffeurs, flotte, banque et recrutement"
          icon={Archive}
          actions={
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          }
        />

        {data?.migrationRequired && (
          <div className="vault-glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              Migration 038 requise — exécutez <code className="text-red-300">npx supabase db push</code>
            </p>
          </div>
        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && <FormAlert message={(error as Error)?.message ?? 'Erreur de chargement.'} />}

        {data && (
          <>
            <VaultDashboardPanel dashboard={data.dashboard} loading={isLoading} />
            <VaultAlertsPanel alerts={data.alerts} />
            <VaultFiltersBar filters={filters} categories={data.categories} onChange={setFilters} />

            {filteredDocs.length === 0 ? (
              <div className="vault-glass rounded-2xl p-12 text-center">
                <Archive className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/45 text-sm">Aucun document trouvé.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDocs.map(doc => (
                  <VaultDocumentCard
                    key={doc.id}
                    document={doc}
                    canApprove={canApprove}
                    busy={busy}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    onReplace={handleReplace}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <VaultUploadModal
          open={showUpload}
          categories={data?.categories ?? []}
          defaultOwnerType={isDriver ? 'driver' : 'company'}
          defaultOwnerId={driverOwnerId}
          lockOwner={isDriver}
          saving={upload.isPending}
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
        />

        {previewDoc?.signed_url && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold truncate">{previewDoc.title}</p>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden vault-glass">
              {previewDoc.mime_type?.includes('pdf') ? (
                <iframe src={previewDoc.signed_url} title={previewDoc.title} className="w-full h-full min-h-[60vh] bg-white" />
              ) : (
                <img src={previewDoc.signed_url} alt={previewDoc.title} className="w-full h-full object-contain" />
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
