import { Home, ClipboardList, FileText, FolderOpen } from 'lucide-react';
import type { DriverPortalTab } from '../../lib/driverPortalTypes';
import { DRIVER_PORTAL_TAB_LABELS } from '../../lib/driverPortalTypes';

const TABS: { id: DriverPortalTab; icon: typeof Home }[] = [
  { id: 'home', icon: Home },
  { id: 'missions', icon: ClipboardList },
  { id: 'sheet', icon: FileText },
  { id: 'docs', icon: FolderOpen },
];

interface DriverMobileNavProps {
  tab: DriverPortalTab;
  onTabChange: (tab: DriverPortalTab) => void;
}

export function DriverMobileNav({ tab, onTabChange }: DriverMobileNavProps) {
  return (
    <nav className="driver-portal-nav fixed bottom-0 left-0 right-0 z-50 px-3 py-2 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around driver-portal-nav-inner rounded-2xl px-1 py-1">
        {TABS.map(item => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`driver-portal-nav-btn flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[68px] ${
                active ? 'driver-portal-nav-btn-active' : 'text-white/35'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-red-400' : ''}`} />
              <span className="text-[10px] font-semibold">{DRIVER_PORTAL_TAB_LABELS[item.id]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
