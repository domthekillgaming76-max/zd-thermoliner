import { useRef } from 'react';
import {
  Calendar, Check, Download, Eye, FileText, Loader2, RefreshCw, Trash2, X,
} from 'lucide-react';
import type { VaultDocument } from '../../lib/vaultTypes';
import {
  VAULT_OWNER_LABELS,
  VAULT_STATUS_COLORS,
  VAULT_STATUS_LABELS,
  formatStorageSize,
} from '../../lib/vaultTypes';

interface VaultDocumentCardProps {
  document: VaultDocument;
  canApprove?: boolean;
  busy?: boolean;
  onPreview: (doc: VaultDocument) => void;
  onDownload: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onReplace: (doc: VaultDocument, file: File) => void;
  onApprove: (doc: VaultDocument) => void;
  onReject: (doc: VaultDocument) => void;
}

export function VaultDocumentCard({
  document: doc,
  canApprove,
  busy,
  onPreview,
  onDownload,
  onDelete,
  onReplace,
  onApprove,
  onReject,
}: VaultDocumentCardProps) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const isPdf = doc.mime_type?.includes('pdf');
  const isImage = doc.mime_type?.startsWith('image/');

  return (
    <article className="vault-doc-card rounded-2xl p-4 flex flex-col gap-3 vault-card-hover">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl vault-doc-icon flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white truncate">{doc.title}</p>
          <p className="text-xs text-white/40 truncate">{doc.category_label ?? doc.category_key}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${VAULT_STATUS_COLORS[doc.status]}`}>
              {VAULT_STATUS_LABELS[doc.status]}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/45">
              {VAULT_OWNER_LABELS[doc.owner_type]}
            </span>
          </div>
        </div>
      </div>

      <div className="text-xs text-white/40 space-y-1">
        {doc.owner_label && <p>Propriétaire : <span className="text-white/60">{doc.owner_label}</span></p>}
        <p>Taille : {formatStorageSize(doc.file_size_bytes)} · {isPdf ? 'PDF' : isImage ? 'Image' : doc.mime_type ?? 'Fichier'}</p>
        {doc.expires_at && (
          <p className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Expire le {new Date(doc.expires_at).toLocaleDateString('fr-FR')}
          </p>
        )}
        {doc.rejection_reason && (
          <p className="text-red-400/80">Motif rejet : {doc.rejection_reason}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <ActionBtn icon={Eye} label="Aperçu" onClick={() => onPreview(doc)} disabled={busy} />
        <ActionBtn icon={Download} label="Télécharger" onClick={() => onDownload(doc)} disabled={busy} />
        <ActionBtn
          icon={RefreshCw}
          label="Remplacer"
          onClick={() => replaceRef.current?.click()}
          disabled={busy}
        />
        <ActionBtn icon={Trash2} label="Supprimer" onClick={() => onDelete(doc)} disabled={busy} danger />
        {canApprove && doc.status === 'pending' && (
          <>
            <ActionBtn icon={Check} label="Approuver" onClick={() => onApprove(doc)} disabled={busy} success />
            <ActionBtn icon={X} label="Rejeter" onClick={() => onReject(doc)} disabled={busy} danger />
          </>
        )}
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onReplace(doc, file);
          e.target.value = '';
        }}
      />
    </article>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
  success,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
        danger
          ? 'text-red-400 bg-red-500/10 hover:bg-red-500/15'
          : success
            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
            : 'text-white/55 bg-white/5 hover:bg-white/8 hover:text-white'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
