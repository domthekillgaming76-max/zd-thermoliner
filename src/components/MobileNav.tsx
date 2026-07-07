import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Route, Banknote, BarChart3, Smartphone, Map } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isDriverRole } from '../lib/accessControl';

const ERP_MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/fleet', icon: Truck, label: 'Flotte' },
  { to: '/road-sheets', icon: Route, label: 'Routes' },
  { to: '/finance', icon: BarChart3, label: 'Finance' },
  { to: '/bank', icon: Banknote, label: 'Banque' },
];

const DRIVER_MOBILE_NAV = [
  { to: '/driver', icon: Smartphone, label: 'Portail' },
  { to: '/tracking', icon: Map, label: 'GPS' },
  { to: '/dispatch', icon: Route, label: 'Missions' },
  { to: '/wall', icon: LayoutDashboard, label: 'Mur' },
  { to: '/profile', icon: BarChart3, label: 'Profil' },
];

export function MobileNav() {
  const { profile } = useAuth();
  const items = isDriverRole(profile?.role) ? DRIVER_MOBILE_NAV : ERP_MOBILE_NAV;

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
