import {
  ArrowRightLeft,
  CreditCard,
  Download,
  FileText,
  Printer,
  Receipt,
} from 'lucide-react';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';

export type QuickActionId =
  | 'transfer'
  | 'cards'
  | 'debits'
  | 'rib'
  | 'statement';

interface QuickAction {
  id: QuickActionId;
  label: string;
  description: string;
  icon: typeof ArrowRightLeft;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'transfer',
    label: 'Faire un virement',
    description: 'Envoyer ou enregistrer un mouvement',
    icon: ArrowRightLeft,
  },
  {
    id: 'cards',
    label: 'Gérer mes cartes',
    description: 'Carte DOM 76 et plafonds',
    icon: CreditCard,
  },
  {
    id: 'debits',
    label: 'Voir mes prélèvements',
    description: 'Dépenses et sorties du compte',
    icon: Receipt,
  },
  {
    id: 'rib',
    label: 'Télécharger un RIB',
    description: 'Relevé d’identité bancaire',
    icon: Download,
  },
  {
    id: 'statement',
    label: 'Imprimer un relevé',
    description: 'Historique du mois en cours',
    icon: Printer,
  },
];

interface BankQuickActionsProps {
  onAction: (id: QuickActionId) => void;
}

export function BankQuickActions({ onAction }: BankQuickActionsProps) {
  return (
    <section className="bank-lounge-panel rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4" style={{ color: BANK_LOUNGE.tealLight }} />
        <h2 className="text-sm font-bold" style={{ color: BANK_LOUNGE.white }}>
          Actions rapides
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              className="bank-lounge-quick-action flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(62, 191, 160, 0.12)',
                  border: `1px solid ${BANK_LOUNGE.panelBorder}`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: BANK_LOUNGE.tealLight }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: BANK_LOUNGE.white }}>
                  {action.label}
                </p>
                <p className="text-[11px] truncate" style={{ color: BANK_LOUNGE.whiteMuted }}>
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
