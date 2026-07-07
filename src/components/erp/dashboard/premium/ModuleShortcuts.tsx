import { Link } from 'react-router-dom';
import type { ElementType } from 'react';
import {
  Users, Truck, Route, Wallet, Building2, ClipboardList, PackageCheck, BarChart3,
} from 'lucide-react';

interface ModuleShortcut {
  label: string;
  description: string;
  icon: ElementType;
  to: string;
  color: string;
}

const MODULES: ModuleShortcut[] = [
  { label: 'Chauffeurs', description: 'Gestion équipe', icon: Users, to: '/drivers', color: '#22d3ee' },
  { label: 'Flotte', description: 'Véhicules & maintenance', icon: Truck, to: '/fleet', color: '#fbbf24' },
  { label: 'Feuilles de route', description: 'Missions & livraisons', icon: Route, to: '/road-sheets', color: '#fb923c' },
  { label: 'Finance', description: 'Revenus & dépenses', icon: Wallet, to: '/finance', color: '#34d399' },
  { label: 'Banque', description: 'Comptes & virements', icon: Building2, to: '/bank', color: '#a78bfa' },
  { label: 'Rapports', description: 'Analyses & exports', icon: BarChart3, to: '/reports', color: '#60a5fa' },
  { label: 'Planning', description: 'Organisation', icon: ClipboardList, to: '/road-sheets', color: '#f472b6' },
  { label: 'Livraisons', description: 'Suivi colis', icon: PackageCheck, to: '/road-sheets', color: '#4ade80' },
];

export function ModuleShortcuts() {
  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-white">Accès rapide</h2>
        <p className="text-[11px] text-white/30 mt-0.5">Modules ERP</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MODULES.map(mod => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.label}
              to={mod.to}
              className="premium-module-link group flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all hover:-translate-y-0.5"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: `${mod.color}12`,
                  border: `1px solid ${mod.color}25`,
                  boxShadow: `0 0 20px ${mod.color}10`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: mod.color }} />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-white group-hover:text-red-300 transition-colors">
                  {mod.label}
                </p>
                <p className="text-[9px] text-white/25 mt-0.5 hidden sm:block">{mod.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
