import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Truck, Banknote, MessageSquare,
  Route, BarChart3, LogOut, ChevronLeft, User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { NotificationBar } from './NotificationBar';
import { useState } from 'react';

const NAV_ITEMS = [
  { section: 'Principal', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/wall', icon: MessageSquare, label: 'Mur société' },
  ]},
  { section: 'Opérations', items: [
    { to: '/drivers', icon: Users, label: 'Chauffeurs' },
    { to: '/fleet', icon: Truck, label: 'Flotte' },
    { to: '/garages', icon: Building2, label: 'Garages' },
    { to: '/road-sheets', icon: Route, label: 'Feuilles de route' },
  ]},
  { section: 'Finance', items: [
    { to: '/economy', icon: BarChart3, label: 'Économie' },
    { to: '/bank', icon: Banknote, label: 'Banque RP' },
  ]},
  { section: 'Compte', items: [
    { to: '/profile', icon: User, label: 'Mon profil' },
  ]},
];

export function Sidebar() {
  const { signOut, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';
  const initials = displayName[0]?.toUpperCase() ?? '?';

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 hidden md:flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}
      style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {collapsed ? <Logo size="sm" showText={false} /> : <Logo size="sm" />}
        <div className="flex items-center gap-1.5">
          {!collapsed && <NotificationBar />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 text-white/40 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map(section => (
          <div key={section.section} className="mb-3">
            {!collapsed && (
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/20">
                {section.section}
              </p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group ${
                    isActive ? 'active bg-red-500/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-red-400' : 'text-white/30 group-hover:text-white/60'}`} />
                    {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {!collapsed && profile && (
          <div className="p-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(229,9,20,0.06)', border: '1px solid rgba(229,9,20,0.12)' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{displayName}</p>
                  <p className="text-white/30 text-xs truncate">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="px-3 pb-3">
          <button
            onClick={signOut}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">Déconnexion</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
