import { NavLink } from 'react-router-dom';
import { LogOut, ChevronLeft } from 'lucide-react';
import { RoleBadge } from './erp/RoleBadge';
import { useAuth } from '../contexts/AuthContext';
import { useAppUpdateBadge } from '../contexts/AppUpdateContext';
import { useSidebar } from '../contexts/SidebarContext';
import { buildSidebarSections } from '../lib/navConfig';

export function Sidebar() {
  const { signOut, profile, user, normalizedRole } = useAuth();
  const { collapsed, toggleCollapsed } = useSidebar();
  const hasUpdate = useAppUpdateBadge();

  const sections = buildSidebarSections(profile?.role ?? normalizedRole, user?.email ?? profile?.email);

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 hidden md:flex flex-col transition-all duration-300 erp-sidebar ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-end px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Réduire la barre latérale"
        >
          <ChevronLeft className={`w-4 h-4 text-white/40 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map(section => (
          <div key={section.title} className="mb-3">
            {!collapsed && (
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
                {section.title}
              </p>
            )}
            {section.items.map(item => (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                end={item.to === '/dashboard' || item.to === '/finance'}
                className={({ isActive }) =>
                  `sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group ${
                    isActive ? 'active bg-red-500/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-red-400' : 'text-white/30 group-hover:text-white/60'}`} />
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm flex-1">{item.label}</span>
                        {item.to === '/updates' && hasUpdate && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">
                            NEW
                          </span>
                        )}
                        {item.badge && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-white/30 bg-white/[0.04]">
                            {item.badge}
                          </span>
                        )}
                        {isActive && !item.badge && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t p-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {!collapsed && profile?.role && (
          <div className="px-3 pb-1">
            <RoleBadge role={profile.role} size="xs" />
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
