import { useRef, useState } from 'react';
import { Wifi } from 'lucide-react';
import { BANK_LOUNGE, CARD_HOLDER, CARD_LAST4 } from '../../../lib/bankLoungeTheme';

interface BankPaymentCard3DProps {
  loading?: boolean;
}

export function BankPaymentCard3D({ loading }: BankPaymentCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState(false);

  if (loading) {
    return <div className="bank-lounge-card rounded-2xl h-[220px] shimmer bank-lounge-shimmer" />;
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -18, y: x * 22 });
  }

  function handleLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div className="bank-card-3d-scene" style={{ perspective: '1200px' }}>
      <div
        ref={cardRef}
        className={`bank-card-3d ${flipped ? 'bank-card-3d-flipped' : ''}`}
        style={{
          transform: flipped
            ? 'rotateY(180deg)'
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
        aria-label="Carte bancaire 3D — cliquer pour retourner"
      >
        <div className="bank-card-3d-face bank-lounge-card rounded-2xl p-6 md:p-7 relative overflow-hidden">
          <div className="bank-lounge-card-shine absolute inset-0 pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">Z&D Thermoliner</p>
              <p className="text-base font-black text-white mt-1">Carte Entreprise</p>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-white/60 rotate-90" />
              <div className="px-2 py-0.5 rounded text-[10px] font-black text-white/90 bg-white/10">VISA</div>
            </div>
          </div>
          <div className="relative mt-8">
            <div className="bank-card-chip w-11 h-8 rounded-md mb-4" />
            <p className="font-mono text-lg tracking-[0.25em] text-white/95 mb-3">
              •••• &nbsp; •••• &nbsp; •••• &nbsp; {CARD_LAST4}
            </p>
            <div className="flex justify-between">
              <div>
                <p className="text-[9px] uppercase text-white/40">Titulaire</p>
                <p className="text-sm font-bold text-white">{CARD_HOLDER}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase text-white/40">Expire</p>
                <p className="text-sm font-bold text-white">12/28</p>
              </div>
            </div>
          </div>
          <div
            className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: BANK_LOUNGE.tealGlow }}
          />
        </div>

        <div className="bank-card-3d-face bank-card-3d-back bank-lounge-card rounded-2xl p-6 relative overflow-hidden">
          <div className="bank-card-magnetic-strip h-10 w-full rounded mt-4 mb-6" />
          <p className="text-xs text-white/50 mb-2">CVV</p>
          <p className="font-mono text-white text-lg mb-6">•••</p>
          <p className="text-[10px] text-white/40 leading-relaxed">
            Carte émise par l&apos;Espace Banque Z&D Thermoliner. Usage professionnel flotte et trésorerie.
            Assistance 24h/24 — conseiller dédié.
          </p>
          <p className="absolute bottom-6 right-6 text-[10px] font-black text-white/30">Z&D</p>
        </div>
      </div>
      <p className="text-center text-[10px] text-white/25 mt-3">Survolez ou cliquez pour l&apos;effet 3D</p>
    </div>
  );
}
