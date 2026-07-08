import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings, Truck } from 'lucide-react';
import { AppUpdateBadge } from '../AppUpdateBadge';
import { useAuth } from '../../contexts/AuthContext';
import { DriverMobileNav } from './DriverMobileNav';
import type { DriverPortalTab } from '../../lib/driverPortalTypes';

interface DriverPortalLayoutProps {
  children: ReactNode;
  tab: DriverPortalTab;
  onTabChange: (tab: DriverPortalTab) => void;
  driverName?: string;
  showHrFolder?: boolean;
}

export function DriverPortalLayout({
  children,
  tab,
  onTabChange,
  driverName,
  showHrFolder = true,
}: DriverPortalLayoutProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col driver-portal-shell" style={{ background: '#060608' }}>
      <header className="driver-portal-header sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl driver-portal-logo flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Z&D Thermoliner</p>
            <p className="text-sm font-bold text-white truncate">{driverName ?? 'Portail chauffeur'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/settings"
            className="relative p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Paramètres"
          >
            <Settings className="w-5 h-5" />
            <AppUpdateBadge className="absolute top-1 right-1 w-2.5 h-2.5 text-[0px]" />
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="p-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2 pb-28 max-w-lg mx-auto w-full driver-portal-main">
        {children}
      </main>

      <DriverMobileNav tab={tab} onTabChange={onTabChange} showHrFolder={showHrFolder} />
    </div>
  );
}
