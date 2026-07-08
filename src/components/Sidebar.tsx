import type { ComponentType, CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, ChevronLeft } from 'lucide-react';
import { RoleBadge } from './erp/RoleBadge';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useAppModules } from '../contexts/AppModulesContext';
import { useAppUpdateBadge } from '../contexts/AppUpdateContext';
import { useSidebar } from '../contexts/SidebarContext';
import { buildDynamicSidebarSections, type NavSection } from '../lib/dynamicNavBuilder';
import { DEFAULT_APP_MODULES } from '../lib/defaultAppModules';
import type { AppModuleRecord } from '../services/appModuleService';
import type { CategoryTheme } from '../lib/sidebarTheme';

function fallbackModules(): AppModuleRecord[] {
  const now = new Date().toISOString();
  return DEFAULT_APP_MODULES.map(m => ({
    ...m,
    id: `default-${m.key}`,
    created_at: now,
    updated_at: now,
  }));
}

function SidebarNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  theme,
  end,
  notifyDot,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  collapsed: boolean;
  theme: CategoryTheme;
  end?: boolean;
  notifyDot?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `zd-sidebar-link group relative flex items-center gap-3 rounded-xl mb-1 transition-all duration-200 ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-2.5 py-2'
        } ${isActive ? 'zd-sidebar-link-active is-active' : 'hover:translate-x-1'}`
      }
      style={({ isActive }) =>
        isActive
          ? {
              background: theme.accentSoft,
              boxShadow: `0 0 20px ${theme.glow}, inset 0 1px 0 ${theme.border}`,
            }
          : undefined
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[58%] rounded-r-full zd-sidebar-active-bar"
              style={{ background: theme.accent, boxShadow: `0 0 10px ${theme.glow}` }}
            />
          )}
          <span
            className={`relative flex items-center justify-center shrink-0 rounded-lg transition-all duration-200 ${
              collapsed ? 'w-9 h-9' : 'w-8 h-8'
            } ${isActive ? 'scale-[1.02]' : 'group-hover:scale-105'}`}
            style={{
              background: isActive ? theme.iconBg : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? theme.border : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <Icon
              className="w-[17px] h-[17px] transition-colors duration-200"
              style={{ color: isActive ? theme.accent : `${theme.accent}99` }}
            />
            {notifyDot && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0a0a0a] animate-pulse" />
            )}
          </span>
          {!collapsed && (
            <span
              className={`flex-1 text-[13px] font-medium truncate transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-white/45 group-hover:text-white/85'
              }`}
            >
              {label}
            </span>
          )}
          {collapsed && notifyDot && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarSection({
  section,
  collapsed,
}: {
  section: NavSection;
  collapsed: boolean;
}) {
  const { theme } = section;

  return (
    <div className="mb-4">
      {!collapsed ? (
        <div className="flex items-center gap-2 px-2 mb-2 mt-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.glow}` }}
          />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: `${theme.accent}cc` }}
          >
            {section.title}
          </p>
          <div className="flex-1 h-px ml-1" style={{ background: `linear-gradient(90deg, ${theme.border}, transparent)` }} />
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <span className="w-5 h-px" style={{ background: theme.border }} />
        </div>
      )}
      <div>
        {section.items.map(item => (
          <SidebarNavLink
            key={`${item.to}-${item.module}`}
            to={item.to}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            theme={theme}
            notifyDot={item.notifyDot}
            end={item.to === '/dashboard' || item.to === '/finance' || item.to === '/wall'}
          />
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { signOut, profile, user, role, normalizedRole } = useAuth();
  const { modules } = useAppModules();
  const { collapsed, toggleCollapsed } = useSidebar();
  const hasUpdate = useAppUpdateBadge();

  const liveRole = role ?? normalizedRole;
  const source = modules.length > 0 ? modules : fallbackModules();
  const sections = buildDynamicSidebarSections(
    liveRole,
    user?.email ?? profile?.email,
    source,
    { hasUpdate },
  );

  return (
    <aside
      className={`zd-sidebar-premium fixed left-0 top-0 h-full z-40 hidden md:flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Header / brand */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-3 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {!collapsed ? (
          <Logo size="sm" />
        ) : (
          <div className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-black text-red-400 text-sm"
            style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(127,29,29,0.15))', border: '1px solid rgba(239,68,68,0.25)' }}>
            Z
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-all duration-200 text-white/35 hover:text-red-400"
          aria-label={collapsed ? 'Déplier la barre latérale' : 'Réduire la barre latérale'}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 zd-sidebar-scroll">
        {sections.map(section => (
          <SidebarSection key={section.title} section={section} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div
        className="border-t p-3 space-y-2 shrink-0"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, transparent, rgba(127,29,29,0.08))',
        }}
      >
        {!collapsed && liveRole && (
          <div className="px-2 pb-1">
            <RoleBadge role={liveRole} size="xs" />
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`zd-sidebar-logout flex items-center gap-3 w-full rounded-xl transition-all duration-200 ${
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          } text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
