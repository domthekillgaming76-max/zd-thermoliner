import { useState } from 'react';
import { AlertTriangle, RotateCcw, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessAdministration } from '../../lib/adminPermissions';
import { useResetRpEconomy } from '../../hooks/useAdminSecurity';

const CONFIRM_PHRASE = 'RESET RP';

export function RpResetPanel() {
  const { profile, user } = useAuth();
  const canManage = canAccessAdministration(profile?.role, user?.email ?? profile?.email);
  const resetMutation = useResetRpEconomy();
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!canManage) return null;

  const canSubmit = acknowledged && confirmation.trim() === CONFIRM_PHRASE && !resetMutation.isPending;

  async function handleReset() {
    setError(null);
    setSuccess(null);
    if (confirmation.trim() !== CONFIRM_PHRASE) {
      setError(`Saisissez exactement « ${CONFIRM_PHRASE} » pour confirmer.`);
      return;
    }
    try {
      const result = await resetMutation.mutateAsync(confirmation.trim());
      setSuccess(result.message);
      setConfirmation('');
      setAcknowledged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la réinitialisation RP.');
    }
  }

  return (
    <div
      className="admin-glass rounded-2xl border border-red-500/25 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.12), rgba(8,8,8,0.95))' }}
    >
      <div className="p-5 border-b border-red-500/15 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <RotateCcw className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Réinitialiser RP
            <Shield className="w-4 h-4 text-amber-400" />
          </h3>
          <p className="text-xs text-white/45 mt-1">
            Lance officiellement la saison RP — remet à zéro l&apos;économie et les statistiques.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-100/80 space-y-2">
            <p className="font-bold text-amber-200">Action irréversible</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-100/70">
              <li>Revenus, dépenses, bénéfices et solde banque → 0 €</li>
              <li>Feuilles de route, livraisons, transactions et factures supprimées</li>
              <li>Km, livraisons et stats chauffeurs remis à zéro</li>
              <li>Classements mensuels et historique finance effacés</li>
            </ul>
            <p className="text-amber-200/90 font-semibold pt-1">
              Conservé : comptes, profils, rôles, modules, flotte, garages, candidatures, DOM76 admin.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            className="mt-0.5 accent-red-500"
          />
          <span className="text-xs text-white/55">
            Je comprends que toutes les données économiques et statistiques de test seront définitivement effacées.
          </span>
        </label>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1.5 block">
            Confirmation écrite
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="erp-input w-full font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[10px] text-white/25 mt-1">
            Tapez <span className="text-red-400 font-bold">{CONFIRM_PHRASE}</span> pour activer le bouton.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleReset}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30"
        >
          {resetMutation.isPending ? 'Réinitialisation en cours…' : 'Réinitialiser RP — Lancement officiel'}
        </button>
      </div>
    </div>
  );
}
