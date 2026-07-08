import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Route, Banknote, BarChart3, Smartphone, Map,
  MessageSquare, Newspaper, Calendar, Briefcase, Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isDriverRole, isVisitorRole } from '../lib/accessControl';
import { canAccessBank } from '../lib/bankPermissions';

const ERP_MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/fleet', icon: Truck, label: 'Flotte' },
  { to: '/road-sheets', icon: Route, label: 'Routes' },
  { to: '/finance', icon: BarChart3, label: 'Finance' },
  { to: '/bank', icon: Banknote, label: 'Banque' },
];

const DRIVER_MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/driver', icon: Smartphone, label: 'Portail' },
  { to: '/tracking', icon: Map, label: 'GPS' },
  { to: '/dispatch', icon: Route, label: 'Missions' },
  { to: '/wall', icon: MessageSquare, label: 'Mur' },
];

const VISITOR_MOBILE_NAV = [
  { to: '/wall', icon: MessageSquare, label: 'Mur' },
  { to: '/updates', icon: Newspaper, label: 'Actus' },
  { to: '/events', icon: Calendar, label: 'Événements' },
  { to: '/recruitment', icon: Briefcase, label: 'Recrutement' },
  { to: '/settings', icon: Settings, label: 'Compte' },
];

function getMobileNavItems(role: string | undefined, email: string | undefined) {
  if (isVisitorRole(role)) return VISITOR_MOBILE_NAV;

  if (isDriverRole(role)) {
    return DRIVER_MOBILE_NAV;
  }

  return ERP_MOBILE_NAV.filter(item => {
    if (item.to === '/bank') return canAccessBank(role, email);
    return true;
  });
}

export function MobileNav() {
  const { profile, user } = useAuth();
  const items = getMobileNavItems(profile?.role, user?.email ?? profile?.email);

  if (items.length === 0) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-1.5 erp-mobile-nav"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-around">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/driver' || item.to === '/documents' || item.to === '/tracking'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[56px] ${
                isActive ? 'text-red-400 bg-red-500/10' : 'text-white/30'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-red-400' : ''}`} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
