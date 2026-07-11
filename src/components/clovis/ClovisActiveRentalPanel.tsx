import { KeyRound, Clock, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import type { ClovisActiveRental, ClovisRentalCharge } from '../../lib/clovisRentalTypes';

interface ClovisActiveRentalPanelProps {
  rental: ClovisActiveRental;
  charges: ClovisRentalCharge[];
  returning?: boolean;
  onReturn: () => void;
}

export function ClovisActiveRentalPanel({
  rental,
  charges,
  returning,
  onReturn,
}: ClovisActiveRentalPanelProps) {
  const accent = rental.catalog?.accent_color ?? '#f59e0b';
  const started = new Date(rental.started_at).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className="clovis-active-rental rounded-2xl p-5 md:p-6 border animate-dashboard-in"
      style={{
        background: `linear-gradient(135deg, ${accent}12 0%, rgba(8,8,8,0.98) 60%)`,
        borderColor: `${accent}44`,
      }}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: accent }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: accent }} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
              Location active — Agence Clovis
            </span>
          </div>

          <div>
            {rental.catalog?.photo_url && (
              <img
                src={rental.catalog.photo_url}
                alt={rental.vehicle_label}
                className="w-full max-w-xs h-32 object-cover rounded-xl border border-white/10 mb-3"
              />
            )}
            <h2 className="text-xl font-black text-white">{rental.vehicle_label}</h2>
            <p className="text-sm text-white/40 mt-1">Contrat {rental.contract_ref}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Clock, label: 'Prise en charge', value: started },
              { icon: FileText, label: 'Jours facturés', value: String(rental.days_rented) },
              { icon: KeyRound, label: 'Tarif / jour', value: fmtEuro(rental.daily_rate) },
              { icon: AlertTriangle, label: 'Total prélevé', value: fmtEuro(rental.total_charged) },
            ].map(row => (
              <div key={row.label} className="rounded-xl bg-black/30 border border-white/6 p-3">
                <row.icon className="w-3.5 h-3.5 text-white/25 mb-1" />
                <p className="text-[9px] text-white/30 uppercase">{row.label}</p>
                <p className="text-xs font-bold text-white mt-0.5">{row.value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-amber-400/80 bg-amber-500/8 border border-amber-500/15 rounded-lg px-3 py-2">
            Prélèvement automatique de {fmtEuro(rental.daily_rate)} par jour sur le compte bancaire
            de l&apos;entreprise Z&amp;D Thermoliner. Les charges s&apos;arrêtent dès la restitution du véhicule.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturn}
          disabled={returning}
          className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-sm font-bold text-white transition-colors disabled:opacity-40"
        >
          <RotateCcw className="w-4 h-4" />
          {returning ? 'Restitution…' : 'Restituer le véhicule'}
        </button>
      </div>

      {charges.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/6">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Derniers prélèvements</p>
          <div className="space-y-1.5">
            {charges.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-black/20">
                <span className="text-white/50">
                  {new Date(c.charge_date).toLocaleDateString('fr-FR')}
                </span>
                <span className="font-bold text-red-400">− {fmtEuro(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
