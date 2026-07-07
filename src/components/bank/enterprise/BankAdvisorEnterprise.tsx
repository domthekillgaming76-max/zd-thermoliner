import { Calendar, Mail, MessageCircle, Phone, UserCircle } from 'lucide-react';
import { CARD_HOLDER } from '../../../lib/bankLoungeTheme';
import { BankGlassPanel } from './BankGlassPanel';

export function BankAdvisorEnterprise() {
  return (
    <BankGlassPanel className="p-5 md:p-6 relative overflow-hidden">
      <div className="bank-lounge-advisor-glow absolute inset-0 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bank-icon-well flex items-center justify-center">
          <UserCircle className="w-14 h-14 bank-lounge-accent-icon" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest font-bold bank-lounge-accent-icon">Conseiller dédié</p>
          <h3 className="text-xl font-black text-white">Marie Dupont</h3>
          <p className="text-sm text-white/50">Gestionnaire entreprise · Flotte & trésorerie</p>
          <p className="text-xs text-white/35 mt-1">Titulaire carte : {CARD_HOLDER}</p>
        </div>
        <div className="flex flex-wrap sm:flex-col gap-2">
          <AdvisorBtn icon={Phone} label="Téléphone" />
          <AdvisorBtn icon={Mail} label="E-mail" />
          <AdvisorBtn icon={MessageCircle} label="Message" />
          <AdvisorBtn icon={Calendar} label="Rendez-vous" primary />
        </div>
      </div>
    </BankGlassPanel>
  );
}

function AdvisorBtn({
  icon: Icon,
  label,
  primary,
}: {
  icon: typeof Phone;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
        primary ? 'bank-lounge-btn-primary' : 'bank-lounge-btn-secondary'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
