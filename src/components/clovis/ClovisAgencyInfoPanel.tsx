import { MapPin, Phone, Clock, Shield, Euro } from 'lucide-react';
import { CLOVIS_DAILY_RATE } from '../../lib/clovisRentalTypes';
import { fmtEuro } from '../../lib/format';

export function ClovisAgencyInfoPanel() {
  return (
    <aside className="clovis-agency-panel rounded-2xl p-5 space-y-5 h-fit sticky top-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/80">Partenaire officiel</p>
        <h2 className="text-2xl font-black text-white mt-1">Clovis Location</h2>
        <p className="text-xs text-white/40 mt-2 leading-relaxed">
          Agence de location poids lourds RP. Flotte Renault T entretenue, contrats journaliers,
          prélèvement automatique sur votre compte Z&amp;D Thermoliner.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { icon: MapPin, label: 'Adresse', value: 'Zone Industrielle Nord — ETS2' },
          { icon: Phone, label: 'Contact', value: 'clovis.location@zd-thermoliner.fr' },
          { icon: Clock, label: 'Horaires', value: '24h/24 — 7j/7 (RP)' },
          { icon: Euro, label: 'Tarif unique', value: `${fmtEuro(CLOVIS_DAILY_RATE)} / jour` },
        ].map(row => (
          <div key={row.label} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <row.icon className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase">{row.label}</p>
              <p className="text-xs text-white/70">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <p className="text-xs font-bold text-amber-200">Conditions RP</p>
        </div>
        <ul className="text-[11px] text-white/45 space-y-1.5 list-disc list-inside">
          <li>1 véhicule actif par chauffeur</li>
          <li>Prélèvement sur le compte entreprise</li>
          <li>450 € / jour tant que le camion est loué</li>
          <li>Restitution = arrêt immédiat des charges</li>
        </ul>
      </div>
    </aside>
  );
}
