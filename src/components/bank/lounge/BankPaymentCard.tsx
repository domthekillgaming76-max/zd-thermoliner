import { Wifi } from 'lucide-react';
import { BANK_LOUNGE, CARD_HOLDER, CARD_LAST4 } from '../../../lib/bankLoungeTheme';

interface BankPaymentCardProps {
  loading?: boolean;
}

export function BankPaymentCard({ loading }: BankPaymentCardProps) {
  if (loading) {
    return (
      <div className="bank-lounge-card rounded-2xl p-6 h-[210px] shimmer bank-lounge-shimmer" />
    );
  }

  return (
    <div className="bank-lounge-card rounded-2xl p-6 md:p-7 relative overflow-hidden aspect-[1.6/1] max-h-[220px] flex flex-col justify-between">
      <div className="bank-lounge-card-shine absolute inset-0 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">
            Carte professionnelle
          </p>
          <p className="text-lg font-black text-white mt-1 tracking-tight">Z&D Thermoliner</p>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-white/60 rotate-90" />
          <div
            className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider text-white/90"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            VISA
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className="w-11 h-8 rounded-md mb-4"
          style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #c9a227 100%)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
          }}
        />
        <p className="font-mono text-lg md:text-xl tracking-[0.25em] text-white/95 mb-3">
          •••• &nbsp; •••• &nbsp; •••• &nbsp; {CARD_LAST4}
        </p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/40 mb-0.5">Titulaire</p>
            <p className="text-sm font-bold text-white tracking-wide">{CARD_HOLDER}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-white/40 mb-0.5">Expire</p>
            <p className="text-sm font-bold text-white">12/28</p>
          </div>
        </div>
      </div>

      <div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: BANK_LOUNGE.tealGlow }}
      />
    </div>
  );
}
