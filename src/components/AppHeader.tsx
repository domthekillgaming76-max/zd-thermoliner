import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Plus, Route, Banknote, User, LogOut, Settings, ChevronDown, Menu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { Logo } from './Logo';
import { NotificationBar } from './NotificationBar';
import { AppUpdateBadge } from './AppUpdateBadge';
import { AdminBadge } from './erp/AdminBadge';
import { RoleBadge } from './erp/RoleBadge';
import { canAccessModule } from '../lib/roleEngine';

const QUICK_ACTIONS = [
  { to: '/road-sheets', icon: Route, label: 'Feuille de route', color: '#fb923c', bankOnly: false },
  { to: '/bank', icon: Banknote, label: 'Transaction', color: '#34d399', bankOnly: true },
  { to: '/drivers', icon: Plus, label: 'Chauffeur', color: '#22d3ee', bankOnly: false },
];

export function AppHeader() {
  const { profile, signOut, isAdministrator, role, normalizedRole } = useAuth();
  const { toggleCollapsed } = useSidebar();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userOpen, setUserOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';
  const initials = displayName[0]?.toUpperCase() ?? '?';
  const liveRole = role ?? normalizedRole;
  const showBank = canAccessModule(liveRole, 'bank');
  const quickActions = QUICK_ACTIONS.filter(a => !a.bankOnly || showBank);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    if (q.includes('chauff') || q.includes('driver')) navigate('/drivers');
    else if (q.includes('flott') || q.includes('camion') || q.includes('truck')) navigate('/fleet');
    else if (q.includes('banq') || q.includes('bank')) navigate(showBank ? '/bank' : '/finance');
    else if (q.includes('route') || q.includes('feuille')) navigate('/road-sheets');
    else if (q.includes('garage')) navigate('/garages');
    else navigate('/dashboard');
  }

  return (
    <header
      className="erp-header sticky top-0 z-30 px-4 md:px-6 h-16 flex items-center gap-3 md:gap-4"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Mobile menu + logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden md:flex w-9 h-9 items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Basculer la barre latérale"
        >
          <Menu className="w-4 h-4 text-white/40" />
        </button>
        <div className="md:hidden">
          <Logo size="sm" showText={false} />
        </div>
        <div className="hidden md:block">
          <Logo size="sm" />
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
        <div
          className={`relative flex items-center rounded-xl transition-all duration-200 ${
            searchFocused ? 'erp-search-focus' : ''
          }`}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Search className="w-4 h-4 text-white/30 absolute left-3 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Rechercher chauffeurs, flotte, routes..."
            className="w-full bg-transparent text-sm text-white placeholder:text-white/25 py-2.5 pl-10 pr-4 outline-none"
          />
        </div>
      </form>

      {/* Mobile search icon */}
      <button
        type="button"
        className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5"
        onClick={() => navigate('/dashboard')}
        aria-label="Rechercher"
      >
        <Search className="w-4 h-4 text-white/40" />
      </button>

      <div className="flex items-center gap-2 md:gap-3 ml-auto flex-shrink-0">
        {/* Quick actions */}
        <div className="hidden lg:flex items-center gap-1.5">
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              title={action.label}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:bg-white/[0.06]"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <action.icon className="w-4 h-4" style={{ color: action.color }} />
            </Link>
          ))}
        </div>

        <Link
          to="/road-sheets"
          className="lg:hidden btn-primary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Nouveau</span>
        </Link>

        <NotificationBar />

        <Link
          to="/profile"
          className="relative hidden sm:flex w-9 h-9 items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
          title="Mon profil"
          aria-label="Mon profil"
        >
          <User className="w-4 h-4 text-white/40" />
          <AppUpdateBadge className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-[0px]" />
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs text-white flex-shrink-0 relative"
              style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)' }}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials}
              <AppUpdateBadge className="absolute -top-1 -right-1 w-2.5 h-2.5 text-[0px] ring-2 ring-[#080808]" />
            </div>
            <span className="hidden md:block text-sm font-semibold text-white/80 max-w-[120px] truncate">
              {displayName}
            </span>
            {isAdministrator ? (
              <AdminBadge className="hidden md:inline-flex" />
            ) : (
              liveRole && <RoleBadge role={liveRole} size="xs" className="hidden md:inline-flex" />
            )}
            <ChevronDown className={`hidden md:block w-3.5 h-3.5 text-white/30 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    {isAdministrator ? (
                      <AdminBadge />
                    ) : (
                      liveRole && <RoleBadge role={liveRole} size="xs" />
                    )}
                  </div>
                  <p className="text-xs text-white/35 truncate mt-1">{profile?.email}</p>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/profile"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="flex-1">Mon profil</span>
                    <AppUpdateBadge className="w-4 h-4 text-[9px]" showCount />
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Paramètres
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); signOut(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
