import { useState } from 'react';
import { Loader2, Radio, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import { TelemetryMissionCard } from '../telemetry/TelemetryMissionCard';
import {
  useActiveTelemetryJobs,
  usePendingTelemetryValidations,
  useValidateTelemetryJob,
  useRejectTelemetryJob,
  useCorrectTelemetryJob,
  type TelemetryJob,
} from '../../hooks/useTelemetryJobs';
import { useAuth } from '../../contexts/AuthContext';
import { canManageDispatch } from '../../lib/dispatchPermissions';

export function TelemetryDispatchPanel() {
  const { data: activeJobs = [], isLoading } = useActiveTelemetryJobs();
  const { data: pendingJobs = [] } = usePendingTelemetryValidations();
  const { profile, user } = useAuth();
  const isManager = canManageDispatch(profile?.role, user?.email);
  const [selected, setSelected] = useState<TelemetryJob | null>(null);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [editKm, setEditKm] = useState('');
  const [editRevenue, setEditRevenue] = useState('');

  const validateMutation = useValidateTelemetryJob();
  const rejectMutation = useRejectTelemetryJob();
  const correctMutation = useCorrectTelemetryJob();

  const allLive = [...activeJobs, ...pendingJobs.filter(p => !activeJobs.some(a => a.id === p.id))];

  async function handleValidate() {
    if (!selected || !user?.id) return;
    await validateMutation.mutateAsync({ jobId: selected.id, validatorId: user.id, comment: comment || undefined });
    setSelected(null);
    setComment('');
  }

  async function handleReject() {
    if (!selected || !user?.id || !rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ jobId: selected.id, validatorId: user.id, reason: rejectReason });
    setSelected(null);
    setRejectReason('');
  }

  async function handleCorrect() {
    if (!selected) return;
    await correctMutation.mutateAsync({
      jobId: selected.id,
      patch: {
        actual_distance_km: editKm ? Number(editKm) : undefined,
        final_income: editRevenue ? Number(editRevenue) : undefined,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-bold text-white">Livraisons télémétrie live</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/25">
            {allLive.length} actives
          </span>
        </div>
        <span className="text-[10px] text-white/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Temps réel
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-red-400" />
        </div>
      ) : allLive.length === 0 ? (
        <div className="erp-card rounded-xl p-8 text-center text-white/40 text-sm">
          Aucune livraison ETS2/ATS en cours.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {allLive.map(job => (
            <TelemetryMissionCard key={job.id} job={job} onSelect={setSelected} />
          ))}
        </div>
      )}

      {selected && isManager && selected.status === 'pending_validation' && (
        <div className="erp-card rounded-xl p-4 border border-amber-500/20 space-y-3">
          <p className="text-sm font-bold text-white">Validation — {selected.source_city} → {selected.destination_city}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Distance réelle (km)"
              value={editKm}
              onChange={e => setEditKm(e.target.value)}
              className="erp-input text-sm"
            />
            <input
              type="number"
              placeholder="Revenu final (€)"
              value={editRevenue}
              onChange={e => setEditRevenue(e.target.value)}
              className="erp-input text-sm"
            />
          </div>
          <textarea
            placeholder="Commentaire (optionnel)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="erp-input text-sm min-h-[60px]"
          />
          <input
            type="text"
            placeholder="Motif de refus"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="erp-input text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCorrect}
              disabled={correctMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/70 border border-white/10"
            >
              <Edit3 className="w-3.5 h-3.5" /> Corriger
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={validateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Valider
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25"
            >
              <XCircle className="w-3.5 h-3.5" /> Refuser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
