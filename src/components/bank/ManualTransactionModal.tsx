import { Loader2, X } from 'lucide-react';
import { MANUAL_CATEGORIES } from '../../services/bankService';

export interface ManualTransactionForm {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  category: string;
  date: string;
}

interface ManualTransactionModalProps {
  open: boolean;
  form: ManualTransactionForm;
  saving: boolean;
  onClose: () => void;
  onChange: (form: ManualTransactionForm) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ManualTransactionModal({
  open,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}: ManualTransactionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-dark-900 border rounded-2xl w-full max-w-md"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <h2 className="font-bold text-white">Opération bancaire manuelle</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['income', 'expense'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...form, type: t })}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  form.type === t
                    ? t === 'income'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/5 text-white/30 border border-white/5'
                }`}
              >
                {t === 'income' ? 'Encaissement' : 'Décaissement'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">
              Montant (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={e => onChange({ ...form, amount: e.target.value })}
              required
              className="erp-input w-full"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <input
              value={form.description}
              onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="Libellé de l'opération"
              className="erp-input w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={e => onChange({ ...form, category: e.target.value })}
                className="erp-select w-full"
              >
                <option value="">Aucune</option>
                {MANUAL_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => onChange({ ...form, date: e.target.value })}
                className="erp-input w-full"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/5 rounded-xl text-white/50 text-sm hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const EMPTY_MANUAL_FORM: ManualTransactionForm = {
  type: 'income',
  amount: '',
  description: '',
  category: '',
  date: new Date().toISOString().split('T')[0],
};
