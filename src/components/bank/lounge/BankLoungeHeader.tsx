import { Leaf, Shield } from 'lucide-react';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';

interface BankLoungeHeaderProps {
  userName?: string | null;
}

export function BankLoungeHeader({ userName }: BankLoungeHeaderProps) {
  const greeting = userName ? `Bonjour, ${userName.split('@')[0]}` : 'Bonjour';

  return (
    <header className="bank-lounge-header rounded-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="bank-lounge-header-pattern absolute inset-0 pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(62, 191, 160, 0.15)',
              border: `1px solid ${BANK_LOUNGE.panelBorder}`,
            }}
          >
            <Leaf className="w-6 h-6" style={{ color: BANK_LOUNGE.tealLight }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: BANK_LOUNGE.whiteMuted }}>
              {greeting}
            </p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: BANK_LOUNGE.white }}>
              Mon espace Banque
            </h1>
            <p className="text-sm mt-1" style={{ color: BANK_LOUNGE.tealLight }}>
              Z&D Thermoliner · Espace personnel sécurisé
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold self-start"
          style={{
            background: 'rgba(0, 107, 63, 0.4)',
            border: `1px solid ${BANK_LOUNGE.panelBorder}`,
            color: BANK_LOUNGE.tealLight,
          }}
        >
          <Shield className="w-3.5 h-3.5" />
          Connexion sécurisée
        </div>
      </div>
    </header>
  );
}
