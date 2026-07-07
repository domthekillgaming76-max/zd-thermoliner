import { X } from 'lucide-react';
import { BANK_LOUNGE, CARD_HOLDER, CARD_LAST4 } from '../../../lib/bankLoungeTheme';
import { BankPaymentCard } from './BankPaymentCard';

interface BankCardsModalProps {
  open: boolean;
  onClose: () => void;
}

export function BankCardsModal({ open, onClose }: BankCardsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="bank-lounge-panel rounded-2xl w-full max-w-md p-6 relative"
        style={{ border: `1px solid ${BANK_LOUNGE.panelBorder}` }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-white/50" />
        </button>
        <h2 className="text-lg font-black mb-1" style={{ color: BANK_LOUNGE.white }}>
          Mes cartes
        </h2>
        <p className="text-sm mb-5" style={{ color: BANK_LOUNGE.whiteMuted }}>
          Carte professionnelle active — Z&D Thermoliner
        </p>
        <BankPaymentCard />
        <div className="mt-5 space-y-2 text-sm" style={{ color: BANK_LOUNGE.whiteMuted }}>
          <div className="flex justify-between">
            <span>Titulaire</span>
            <span className="font-semibold text-white/80">{CARD_HOLDER}</span>
          </div>
          <div className="flex justify-between">
            <span>Numéro masqué</span>
            <span className="font-mono text-white/80">•••• {CARD_LAST4}</span>
          </div>
          <div className="flex justify-between">
            <span>Plafond mensuel</span>
            <span className="font-semibold text-white/80">15 000 €</span>
          </div>
          <div className="flex justify-between">
            <span>Statut</span>
            <span className="font-semibold" style={{ color: BANK_LOUNGE.tealLight }}>
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
