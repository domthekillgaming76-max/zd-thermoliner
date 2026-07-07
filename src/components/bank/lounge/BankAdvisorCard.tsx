import { Mail, MessageCircle, Phone, UserCircle } from 'lucide-react';
import { BANK_LOUNGE, CARD_HOLDER } from '../../../lib/bankLoungeTheme';

export function BankAdvisorCard() {
  return (
    <section className="bank-lounge-advisor rounded-2xl p-5 md:p-6 relative overflow-hidden">
      <div className="bank-lounge-advisor-glow absolute inset-0 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row gap-4 sm:items-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(62, 191, 160, 0.15)',
            border: `1px solid ${BANK_LOUNGE.panelBorder}`,
          }}
        >
          <UserCircle className="w-9 h-9" style={{ color: BANK_LOUNGE.tealLight }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: BANK_LOUNGE.tealLight }}>
            Votre conseiller dédié
          </p>
          <h3 className="text-lg font-black" style={{ color: BANK_LOUNGE.white }}>
            Marie Dupont
          </h3>
          <p className="text-sm mt-0.5" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Gestionnaire de compte · Flotte &amp; trésorerie Z&D
          </p>
          <p className="text-xs mt-2" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Titulaire carte : <span className="font-semibold text-white/80">{CARD_HOLDER}</span>
          </p>
        </div>
        <div className="flex sm:flex-col gap-2 flex-shrink-0">
          <AdvisorContact icon={Phone} label="Appeler" />
          <AdvisorContact icon={Mail} label="E-mail" />
          <AdvisorContact icon={MessageCircle} label="Message" />
        </div>
      </div>
    </section>
  );
}

function AdvisorContact({
  icon: Icon,
  label,
}: {
  icon: typeof Phone;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        border: `1px solid ${BANK_LOUNGE.panelBorder}`,
        color: BANK_LOUNGE.tealLight,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
