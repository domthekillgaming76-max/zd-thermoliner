import { Shield, Users, Heart, Truck } from 'lucide-react';

export function RecruitmentInfoPanel() {
  return (
    <aside className="space-y-4">
      <div className="erp-card rounded-2xl p-5 border border-teal-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-white">Z&D Thermoliner</h3>
            <p className="text-xs text-teal-400/80">Transport RP premium</p>
          </div>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">
          À propos de nous — Une VTC française passionnée par la route, le réalisme et l&apos;esprit d&apos;équipe.
          Nous construisons une flotte professionnelle sur ETS2 / ATS.
        </p>
      </div>

      <div className="erp-card rounded-2xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Nos valeurs</h4>
        <ul className="space-y-2.5">
          {[
            { icon: Shield, text: 'Respect des règles' },
            { icon: Users, text: 'Esprit d\'équipe' },
            { icon: Heart, text: 'Convivialité' },
            { icon: Truck, text: 'Activités régulières' },
          ].map(item => (
            <li key={item.text} className="flex items-center gap-2.5 text-sm text-white/60">
              <item.icon className="w-4 h-4 text-teal-400 flex-shrink-0" />
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="erp-card rounded-2xl p-5 border border-amber-500/10 bg-amber-500/[0.03]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400/80 mb-2">Statut candidature</h4>
        <p className="text-sm text-white/50">
          Après envoi, le PDG examine votre dossier sous 48–72 h. Vous recevrez une notification dans
          « Mes candidatures ».
        </p>
      </div>
    </aside>
  );
}
