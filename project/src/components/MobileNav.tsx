import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Route, Banknote, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { NotificationBar } from './NotificationBar';

const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/fleet', icon: Truck, label: 'Flotte' },
  { to: '/road-sheets', icon: Route, label: 'Routes' },
  { to: '/bank', icon: Banknote, label: 'Banque' },
  { to: '/wall', icon: MessageSquare, label: 'Mur' },
];

export function MobileNav() {
  const { profile } = useAuth();

  return (
    <>
      <header className="mobile-header md:hidden fixed top-0 left-0 right-0 h-16 z-50 px-4 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <NotificationBar />
          <NavLink
            to="/profile"
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)' }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <User className="w-4 h-4 text-white" />
            }
          </NavLink>
        </div>
      </header>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-1"
        style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(239,68,68,0.12)' }}
      >
        <div className="flex items-center justify-around">
          {MOBILE_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? 'text-red-400 bg-red-500/10' : 'text-white/30'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-red-400' : ''}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
