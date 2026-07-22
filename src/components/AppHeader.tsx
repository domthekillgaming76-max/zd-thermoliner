import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, ChevronDown, Clock3, LogOut, Menu, MessageCircle,
  Search, Settings, User, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { Logo } from './Logo';
import { NotificationBar } from './NotificationBar';
import { AppUpdateBadge } from './AppUpdateBadge';
import { UserBadges } from './erp/UserBadges';
import { canAccessModule } from '../lib/roleEngine';

export function AppHeader() {
  const { profile, signOut, isAdministrator, role, normalizedRole, user } = useAuth();
  const { toggleCollapsed } = useSidebar();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userOpen, setUserOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';
  const initials = displayName[0]?.toUpperCase() ?? '?';
  const liveRole = role ?? normalizedRole;
  const showBank = canAccessModule(liveRole, 'bank');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    if (q.includes('chauff') || q.includes('driver')) navigate('/drivers');
    else if (q.includes('flott') || q.includes('camion') || q.includes('truck')) navigate('/fleet');
    else if (q.includes('banq') || q.includes('bank')) navigate(showBank ? '/bank' : '/finance');
    else if (q.includes('route') || q.includes('feuille')) navigate('/road-sheets');
    else if (q.includes('garage')) navigate('/garages');
    else if (q.includes('repas') || q.includes('restaurant')) navigate('/meals');
    else if (q.includes('boutique') || q.includes('équipement') || q.includes('decoration')) navigate('/truck-shop');
    else navigate('/dashboard');
  }

  const iconLinks = [
    { to: '/chat', icon: MessageCircle, label: 'Messages' },
    { to: '/drivers', icon: Users, label: 'Utilisateurs' },
    { to: '/events', icon: CalendarDays, label: 'Calendrier' },
  ];

  return (
    <header className="erp-header fleet-app-header sticky top-0 z-30 px-3 sm:px-4 lg:px-6 h-[74px] flex items-center gap-3 lg:gap-5">
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={toggleCollapsed} className="fleet-header-icon hidden md:flex" aria-label="Basculer la barre latérale">
          <Menu className="w-[18px] h-[18px]" />
        </button>
        <div className="md:hidden"><Logo size="sm" showText={false} /></div>
        <div className="hidden lg:block min-w-[190px]">
          <p className="text-sm font-semibold text-white truncate">Bonjour {displayName}</p>
          <p className="text-[10px] text-white/35 mt-0.5 tracking-wide">Bienvenue sur Z&amp;D Thermoliner</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto hidden sm:block">
        <div className="fleet-global-search">
          <Search className="w-4 h-4 text-white/35 absolute left-4 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un chauffeur, véhicule, mission..."
            className="w-full bg-transparent text-xs text-white placeholder:text-white/28 py-3 pl-11 pr-16 outline-none"
          />
          <kbd className="absolute right-3 text-[9px] text-white/25 border border-white/10 bg-white/[.04] rounded-md px-1.5 py-1">CTRL K</kbd>
        </div>
      </form>

      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <div className="hidden xl:flex items-center gap-1">
          {iconLinks.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="fleet-header-icon" title={label} aria-label={label}><Icon className="w-[17px] h-[17px]" /></Link>
          ))}
        </div>
        <NotificationBar />
        <div className="hidden 2xl:flex items-center gap-2 px-3 h-10 rounded-xl border border-white/[.07] bg-white/[.035]">
          <Clock3 className="w-3.5 h-3.5 text-red-400" />
          <div className="leading-none"><p className="text-xs font-semibold tabular-nums text-white">{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-[8px] text-white/30 mt-1 capitalize">{now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p></div>
        </div>

        <div className="relative ml-1">
          <button type="button" onClick={() => setUserOpen(!userOpen)} className="fleet-user-button">
            <div className="fleet-user-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
              <AppUpdateBadge className="absolute -top-1 -right-1 w-2.5 h-2.5 text-[0px]" />
            </div>
            <div className="hidden lg:block text-left min-w-0"><p className="text-[11px] font-semibold text-white truncate max-w-[92px]">{displayName}</p><p className="text-[8px] uppercase tracking-wider text-white/30">{liveRole || 'Membre'}</p></div>
            <ChevronDown className={`hidden lg:block w-3.5 h-3.5 text-white/30 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
              <div className="fleet-user-menu absolute right-0 top-full mt-3 w-60 z-50 overflow-hidden">
                <div className="p-4 border-b border-white/[.07]">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-white/35 truncate mt-1">{profile?.email}</p>
                  <UserBadges isAdministrator={isAdministrator} role={liveRole} email={user?.email ?? profile?.email} size="xs" className="mt-2" />
                </div>
                <div className="p-2">
                  <Link to="/profile" onClick={() => setUserOpen(false)} className="fleet-menu-link"><User className="w-4 h-4" /> Mon profil</Link>
                  <Link to="/settings" onClick={() => setUserOpen(false)} className="fleet-menu-link"><Settings className="w-4 h-4" /> Paramètres</Link>
                  <button type="button" onClick={() => { setUserOpen(false); signOut(); }} className="fleet-menu-link is-danger"><LogOut className="w-4 h-4" /> Déconnexion</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
