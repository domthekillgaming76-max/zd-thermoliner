import { useEffect, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import type { VaultCategory, VaultOwnerType, VaultUploadInput } from '../../lib/vaultTypes';
import { VAULT_OWNER_LABELS } from '../../lib/vaultTypes';
import { fetchVaultOwners } from '../../services/vaultService';

interface VaultUploadModalProps {
  open: boolean;
  categories: VaultCategory[];
  defaultOwnerType?: VaultOwnerType;
  defaultOwnerId?: string | null;
  lockOwner?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: VaultUploadInput) => Promise<void>;
}

export function VaultUploadModal({
  open,
  categories,
  defaultOwnerType = 'company',
  defaultOwnerId = null,
  lockOwner = false,
  saving,
  onClose,
  onSubmit,
}: VaultUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [categoryKey, setCategoryKey] = useState(categories[0]?.key ?? '');
  const [ownerType, setOwnerType] = useState<VaultOwnerType>(defaultOwnerType);
  const [ownerId, setOwnerId] = useState<string | null>(defaultOwnerId);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [owners, setOwners] = useState<{ id: string; label: string }[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOwnerType(defaultOwnerType);
    setOwnerId(defaultOwnerId);
  }, [open, defaultOwnerType, defaultOwnerId]);

  useEffect(() => {
    if (!open || ownerType === 'company') {
      setOwners([]);
      return;
    }
    setLoadingOwners(true);
    fetchVaultOwners(ownerType)
      .then(setOwners)
      .finally(() => setLoadingOwners(false));
  }, [open, ownerType]);

  const filteredCategories = categories.filter(
    c => c.owner_type === ownerType || ownerType === 'company',
  );

  useEffect(() => {
    if (filteredCategories.length && !filteredCategories.find(c => c.key === categoryKey)) {
      setCategoryKey(filteredCategories[0].key);
    }
  }, [filteredCategories, categoryKey]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    await onSubmit({
      file,
      title: title.trim() || file.name,
      categoryKey,
      ownerType,
      ownerId: ownerType === 'company' ? null : ownerId,
      expiresAt: expiresAt || null,
      notes: notes || undefined,
    });
    setFile(null);
    setTitle('');
    setExpiresAt('');
    setNotes('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="vault-glass w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-red-400" />
            Ajouter un document
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Fichier (PDF / image)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            required
            className="erp-input w-full"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Titre</label>
          <input
            className="erp-input w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={file?.name ?? 'Titre du document'}
          />
        </div>

        {!lockOwner && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Propriétaire</label>
              <select
                className="erp-select w-full"
                value={ownerType}
                onChange={e => {
                  setOwnerType(e.target.value as VaultOwnerType);
                  setOwnerId(null);
                }}
              >
                {(Object.keys(VAULT_OWNER_LABELS) as VaultOwnerType[]).map(t => (
                  <option key={t} value={t}>{VAULT_OWNER_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {ownerType !== 'company' && (
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Référence</label>
                <select
                  className="erp-select w-full"
                  value={ownerId ?? ''}
                  onChange={e => setOwnerId(e.target.value || null)}
                  required
                  disabled={loadingOwners}
                >
                  <option value="">Sélectionner...</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Catégorie</label>
          <select
            className="erp-select w-full"
            value={categoryKey}
            onChange={e => setCategoryKey(e.target.value)}
          >
            {filteredCategories.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Date d&apos;expiration</label>
          <input
            type="date"
            className="erp-input w-full"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Notes</label>
          <textarea
            className="erp-input w-full min-h-[72px]"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={!file || saving || (ownerType !== 'company' && !ownerId)}
          className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          Téléverser dans le coffre-fort
        </button>
      </form>
    </div>
  );
}
