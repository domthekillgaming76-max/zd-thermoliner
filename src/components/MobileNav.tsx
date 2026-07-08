import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppModules } from '../contexts/AppModulesContext';
import { buildDynamicMobileNavItems } from '../lib/dynamicNavBuilder';
import { buildMobileNavItems } from '../lib/navConfig';

export function MobileNav() {
  const { profile, user, role, normalizedRole } = useAuth();
  const { modules } = useAppModules();
  const liveRole = role ?? normalizedRole;
  const dynamicItems = buildDynamicMobileNavItems(liveRole, user?.email ?? profile?.email, modules);
  const fallbackItems = buildMobileNavItems(liveRole, user?.email ?? profile?.email);
  const items = dynamicItems.length > 0 ? dynamicItems : fallbackItems;

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
            end={item.to === '/dashboard' || item.to === '/driver' || item.to === '/documents' || item.to === '/tracking' || item.to === '/wall'}
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
