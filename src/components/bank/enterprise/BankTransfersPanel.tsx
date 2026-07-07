import { useState } from 'react';
import { ArrowRightLeft, Calendar, Loader2, Zap } from 'lucide-react';
import type { TransferKind } from '../../../services/bankTransferService';
import { BankGlassPanel } from './BankGlassPanel';

const TRANSFER_TYPES: { kind: TransferKind; label: string; desc: string }[] = [
  { kind: 'internal', label: 'Virement interne', desc: 'Entre comptes Z&D' },
  { kind: 'driver', label: 'Paiement chauffeur', desc: 'Salaire ou prime' },
  { kind: 'supplier', label: 'Paiement fournisseur', desc: 'Facture ou prestation' },
  { kind: 'instant', label: 'Virement instantané', desc: 'Exécution immédiate' },
  { kind: 'scheduled', label: 'Virement programmé', desc: 'Planifier une date' },
];

interface BankTransfersPanelProps {
  onSubmit: (input: {
    kind: TransferKind;
    amount: number;
    beneficiary: string;
    reference: string;
    scheduledDate?: string;
  }) => Promise<void>;
  saving?: boolean;
}

export function BankTransfersPanel({ onSubmit, saving }: BankTransfersPanelProps) {
  const [kind, setKind] = useState<TransferKind>('internal');
  const [amount, setAmount] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [reference, setReference] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || !beneficiary.trim()) return;
    await onSubmit({
      kind,
      amount: parsed,
      beneficiary: beneficiary.trim(),
      reference: reference.trim(),
      scheduledDate: kind === 'scheduled' ? scheduledDate : undefined,
    });
    setAmount('');
    setBeneficiary('');
    setReference('');
    setScheduledDate('');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-3">
        {TRANSFER_TYPES.map(t => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setKind(t.kind)}
            className={`w-full bank-lounge-quick-action flex items-center gap-3 p-4 rounded-xl text-left ${
              kind === t.kind ? 'ring-1 ring-teal-400/40' : ''
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 bank-lounge-accent-icon flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">{t.label}</p>
              <p className="text-xs text-white/40">{t.desc}</p>
            </div>
            {t.kind === 'instant' && <Zap className="w-4 h-4 text-amber-400 ml-auto" />}
            {t.kind === 'scheduled' && <Calendar className="w-4 h-4 text-blue-400 ml-auto" />}
          </button>
        ))}
      </div>

      <BankGlassPanel className="lg:col-span-7 p-6">
        <h2 className="text-lg font-black text-white mb-4">Nouveau virement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Bénéficiaire *</label>
            <input value={beneficiary} onChange={e => setBeneficiary(e.target.value)} required className="erp-input w-full" placeholder="Nom ou IBAN" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Montant (€) *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="erp-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Référence</label>
              <input value={reference} onChange={e => setReference(e.target.value)} className="erp-input w-full" placeholder="Libellé" />
            </div>
          </div>
          {kind === 'scheduled' && (
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase mb-1.5">Date programmée</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} required className="erp-input w-full" />
            </div>
          )}
          <button type="submit" disabled={saving} className="bank-lounge-btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Traitement...' : 'Confirmer le virement'}
          </button>
        </form>
      </BankGlassPanel>
    </div>
  );
}
