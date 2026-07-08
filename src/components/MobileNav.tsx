import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buildMobileNavItems } from '../lib/navConfig';

export function MobileNav() {
  const { profile, user, normalizedRole } = useAuth();
  const items = buildMobileNavItems(profile?.role ?? normalizedRole, user?.email ?? profile?.email);

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
