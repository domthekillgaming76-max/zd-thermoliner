import { useRef, useState } from 'react';
import { CheckCircle2, Container, Loader2, Truck, Upload, Warehouse, Building2 } from 'lucide-react';
import type { DriverDocType, DriverDocument, Trailer } from '../../lib/driverTypes';
import { DOC_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '../../lib/driverTypes';
import type { Truck as TruckType } from '../../lib/supabase';
import { useAssignGarage, useAssignTrailer, useAssignTruck } from '../../hooks/useDrivers';

interface DriverAssignmentPanelProps {
  driverId: string;
  truckId: string | null;
  trailerId: string | null;
  garageId?: string | null;
  fleetName?: string | null;
  garageName?: string | null;
  trucks: TruckType[];
  trailers: Trailer[];
  garages?: { id: string; name: string; city: string | null }[];
  readOnly?: boolean;
}

export function DriverAssignmentPanel({
  driverId,
  truckId,
  trailerId,
  garageId,
  fleetName,
  garageName,
  trucks,
  trailers,
  garages = [],
  readOnly = false,
}: DriverAssignmentPanelProps) {
  const assignTruck = useAssignTruck();
  const assignTrailer = useAssignTrailer();
  const assignGarage = useAssignGarage();

  const currentTruck = trucks.find(t => t.id === truckId);
  const currentTrailer = trailers.find(t => t.id === trailerId);
  const availableTrucks = trucks.filter(t => !t.driver_id || t.driver_id === driverId);
  const availableTrailers = trailers.filter(t => !t.driver_id || t.driver_id === driverId);

  return (
    <div className="driver-glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">Affectation véhicules & flotte</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-white/50 uppercase">Flotte</span>
          </div>
          <p className="text-sm text-white">{fleetName ?? 'Z&D Thermoliner'}</p>
        </div>
        <AssignBlock
          icon={Truck}
          label="Camion"
          current={currentTruck ? `${currentTruck.brand ?? ''} ${currentTruck.model ?? ''} (${currentTruck.registration})`.trim() : 'Non assigné'}
          options={availableTrucks.map(t => ({ id: t.id, label: `${t.registration} — ${t.brand ?? ''} ${t.model ?? ''}`.trim() }))}
          selectedId={truckId}
          loading={assignTruck.isPending}
          readOnly={readOnly}
          onAssign={id => assignTruck.mutate({ driverId, truckId: id })}
        />
        <AssignBlock
          icon={Container}
          label="Remorque"
          current={currentTrailer ? `${currentTrailer.type} (${currentTrailer.registration})` : 'Non assignée'}
          options={availableTrailers.map(t => ({ id: t.id, label: `${t.registration} — ${t.type}` }))}
          selectedId={trailerId}
          loading={assignTrailer.isPending}
          readOnly={readOnly}
          onAssign={id => assignTrailer.mutate({ driverId, trailerId: id })}
        />
        <AssignBlock
          icon={Warehouse}
          label="Garage"
          current={garageName ?? 'Non assigné'}
          options={garages.map(g => ({ id: g.id, label: `${g.name}${g.city ? ` — ${g.city}` : ''}` }))}
          selectedId={garageId ?? null}
          loading={assignGarage.isPending}
          readOnly={readOnly}
          onAssign={id => assignGarage.mutate({ driverId, garageId: id })}
        />
      </div>
    </div>
  );
}

function AssignBlock({
  icon: Icon,
  label,
  current,
  options,
  selectedId,
  loading,
  readOnly,
  onAssign,
}: {
  icon: typeof Truck;
  label: string;
  current: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  loading: boolean;
  readOnly?: boolean;
  onAssign: (id: string | null) => void;
}) {
  return (
    <div className="rounded-xl p-4 bg-white/[0.02] border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-red-400" />
        <span className="text-xs font-bold text-white/50 uppercase">{label}</span>
      </div>
      <p className="text-sm text-white mb-3 truncate">{current}</p>
      {readOnly ? null : (
        <>
          <select
            value={selectedId ?? ''}
            onChange={e => onAssign(e.target.value || null)}
            disabled={loading}
            className="erp-select w-full text-sm"
          >
            <option value="">— Aucun —</option>
            {options.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-white/30 mt-2" />}
        </>
      )}
    </div>
  );
}

const UPLOAD_DOC_TYPES: DriverDocType[] = ['license', 'medical', 'adr', 'identity', 'contract', 'insurance'];

interface DriverDocumentsPanelProps {
  driverId: string;
  documents: DriverDocument[];
  onUpload: (file: File, docType: DriverDocType, expiresAt?: string) => void;
  onApprove?: (documentId: string) => void;
  uploading?: boolean;
  approving?: boolean;
  isAdmin?: boolean;
}
export function DriverDocumentsPanel({ documents, onUpload, onApprove, uploading, approving, isAdmin }: DriverDocumentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DriverDocType>('license');
  const [expiresAt, setExpiresAt] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, docType, expiresAt || undefined);
      setExpiresAt('');
    }
    e.target.value = '';
  }

  return (
    <div className="driver-glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Documents</h3>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
          <Upload className="w-3.5 h-3.5" />
          Importer
        </button>
        <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Type de document</label>
          <select value={docType} onChange={e => setDocType(e.target.value as DriverDocType)} className="erp-select w-full text-sm">
            {UPLOAD_DOC_TYPES.map(type => (
              <option key={type} value={type}>{DOC_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase mb-1">Date d&apos;expiration</label>
          <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="erp-input w-full text-sm" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        {UPLOAD_DOC_TYPES.map(type => {
          const doc = documents.find(d => d.doc_type === type);
          const expired = doc?.expires_at && new Date(doc.expires_at) < new Date();
          const expiringSoon = doc?.expires_at && !expired && (() => {
            const days = Math.ceil((new Date(doc.expires_at!).getTime() - Date.now()) / 86400000);
            return days <= 60;
          })();
          return (
            <div key={type} className={`rounded-xl p-3 border ${
              expired ? 'border-red-500/30 bg-red-500/5' : expiringSoon ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 bg-white/[0.02]'
            }`}>
              <p className="text-xs font-semibold text-white/50 uppercase">{DOC_TYPE_LABELS[type]}</p>
              {doc ? (
                <>
                  <a href={doc.file_url ?? '#'} target="_blank" rel="noreferrer" className="text-sm text-red-400 hover:underline truncate block">{doc.file_name ?? 'Document'}</a>
                  {doc.status && (
                    <p className="text-[10px] mt-0.5 text-white/40">{DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}</p>
                  )}
                  {doc.expires_at && (
                    <p className={`text-[10px] mt-1 ${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-white/35'}`}>
                      Expire : {new Date(doc.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {isAdmin && doc.status === 'pending' && onApprove && (
                    <button
                      type="button"
                      disabled={approving}
                      onClick={() => onApprove(doc.id)}
                      className="mt-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Approuver
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-white/25 mt-1">Non fourni</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/25">Rappels automatiques 60 jours avant expiration.</p>
    </div>
  );
}
