import { useState } from 'react';
import { Check, X, XCircle } from 'lucide-react';
import type { RoadSheet } from '../../lib/supabase';

interface ValidationActionsProps {
  sheet: RoadSheet;
  canValidate: boolean;
  onValidate: (sheet: RoadSheet) => void;
  onReject: (sheetId: string, reason: string) => void;
  validating?: boolean;
  rejecting?: boolean;
}

export function ValidationActions({
  sheet,
  canValidate,
  onValidate,
  onReject,
  validating = false,
  rejecting = false,
}: ValidationActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  if (!canValidate) return null;

  const isRejected = sheet.status === 'rejected';
  const isValidated = sheet.validated;

  function handleReject() {
    if (!reason.trim()) return;
    onReject(sheet.id, reason.trim());
    setShowReject(false);
    setReason('');
  }

  if (showReject) {
    return (
      <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[200px]">
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif du rejet..."
          className="px-3 py-2 bg-white/5 border rounded-lg text-white text-xs placeholder-white/20 focus:outline-none focus:border-red-500/50"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowReject(false); setReason(''); }}
            className="flex-1 py-1.5 bg-white/5 rounded-lg text-white/40 text-xs"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={!reason.trim() || rejecting}
            className="flex-1 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {rejecting ? '...' : 'Confirmer'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {(isRejected || (!isValidated && !isRejected)) && (
        <>
          <button
            type="button"
            onClick={() => onValidate(sheet)}
            disabled={validating}
            title="Valider"
            className="w-8 h-8 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-emerald-400" />
          </button>
          {!isRejected && (
            <button
              type="button"
              onClick={() => setShowReject(true)}
              disabled={rejecting}
              title="Rejeter"
              className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 text-red-400" />
            </button>
          )}
        </>
      )}
      {isValidated && (
        <div
          title="Validée"
          className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
      )}
      {isRejected && (
        <button
          type="button"
          onClick={() => setShowReject(false)}
          title="Rejetée"
          className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      )}
    </div>
  );
}

export function ValidationBadge({ sheet }: { sheet: RoadSheet }) {
  if (sheet.validated) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
        Validée
      </span>
    );
  }
  if (sheet.status === 'rejected') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-red-400 bg-red-500/10 border-red-500/20">
        Rejetée
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-yellow-400 bg-yellow-500/10 border-yellow-500/20">
      En attente
    </span>
  );
}
