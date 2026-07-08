import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppModules } from '../contexts/AppModulesContext';
import { buildDynamicMobileNavItems } from '../lib/dynamicNavBuilder';
import { DEFAULT_APP_MODULES } from '../lib/defaultAppModules';
import { getCategoryTheme, MODULE_SIDEBAR_CATEGORY } from '../lib/sidebarTheme';
import type { AppModuleRecord } from '../services/appModuleService';

function fallbackModules(): AppModuleRecord[] {
  const now = new Date().toISOString();
  return DEFAULT_APP_MODULES.map(m => ({
    ...m,
    id: `default-${m.key}`,
    created_at: now,
    updated_at: now,
  }));
}

export function MobileNav() {
  const { profile, user, role, normalizedRole } = useAuth();
  const { modules } = useAppModules();
  const liveRole = role ?? normalizedRole;
  const source = modules.length > 0 ? modules : fallbackModules();
  const items = buildDynamicMobileNavItems(
    liveRole,
    user?.email ?? profile?.email,
    source,
    5,
  );

  if (items.length === 0) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-1.5 erp-mobile-nav zd-mobile-nav"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-around gap-0.5">
        {items.map(item => {
          const cat = MODULE_SIDEBAR_CATEGORY[String(item.module)] ?? 'Accueil';
          const theme = getCategoryTheme(cat);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard' || item.to === '/wall' || item.to === '/profile'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                  isActive ? 'scale-[1.02]' : 'hover:translate-y-[-1px]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{
                      background: isActive ? theme.accentSoft : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? theme.border : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isActive ? `0 0 14px ${theme.glow}` : undefined,
                    }}
                  >
                    <item.icon
                      className="w-[18px] h-[18px]"
                      style={{ color: isActive ? theme.accent : `${theme.accent}88` }}
                    />
                    {item.notifyDot && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#080808] animate-pulse" />
                    )}
                  </span>
                  <span
                    className="text-[9px] font-semibold truncate max-w-[56px]"
                    style={{ color: isActive ? theme.accent : 'rgba(255,255,255,0.35)' }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
