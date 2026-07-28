import { Loader2, WalletCards, X } from 'lucide-react';
import { fmtEuro } from '../../lib/format';

export const PERSONAL_DEBIT_CATEGORIES = [
  'Achats personnels',
  'Alimentation',
  'Loisirs',
  'Logement',
  'Transport personnel',
  'Retrait espèces',
  'Abonnement',
  'Autre',
] as const;

export interface DriverDebitForm {
  amount: string;
  label: string;
  category: string;
}

interface DriverDebitModalProps {
  open: boolean;
  balance: number;
  form: DriverDebitForm;
  saving: boolean;
  error: string | null;
  onChange: (form: DriverDebitForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function DriverDebitModal({
  open, balance, form, saving, error, onChange, onClose, onSubmit,
}: DriverDebitModalProps) {
  if (!open) return null;
  const amount = Number(form.amount || 0);
  const remaining = Math.max(0, balance - amount);

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-dark-900 border border-emerald-500/20 shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-white">Nouvelle opération</h2>
              <p className="text-[11px] text-white/35">Décaissement du compte personnel</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-3 text-xs">
            <div><p className="text-white/35">Solde actuel</p><p className="font-black text-white mt-1">{fmtEuro(balance)}</p></div>
            <div className="text-right"><p className="text-white/35">Après opération</p><p className={`font-black mt-1 ${amount > balance ? 'text-red-400' : 'text-emerald-400'}`}>{fmtEuro(remaining)}</p></div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/40 mb-1.5">Montant à décaisser (€) *</label>
            <input type="number" min="0.01" max={balance} step="0.01" required autoFocus
              value={form.amount} onChange={e => onChange({ ...form, amount: e.target.value })}
              className="erp-input w-full" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/40 mb-1.5">Motif *</label>
            <input required minLength={3} maxLength={120} value={form.label}
              onChange={e => onChange({ ...form, label: e.target.value })}
              className="erp-input w-full" placeholder="Ex. Courses personnelles" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/40 mb-1.5">Catégorie *</label>
            <select required value={form.category} onChange={e => onChange({ ...form, category: e.target.value })} className="erp-select w-full">
              {PERSONAL_DEBIT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          {error && <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">{error}</p>}
          <p className="text-[11px] text-white/30">Cette opération sera immédiatement débitée et ajoutée à votre relevé bancaire personnel.</p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-bold">Annuler</button>
            <button type="submit" disabled={saving || amount <= 0 || amount > balance || form.label.trim().length < 3}
              className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Décaissement…' : 'Décaisser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
