import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessRoute, getRoleRedirect, ROLE_SYNC_EVENT } from '../lib/roleEngine';

interface RoleSyncGuardProps {
  children: ReactNode;
}

/** Live route guard — redirects when role change revokes current page access */
export function RoleSyncGuard({ children }: RoleSyncGuardProps) {
  const { user, role, normalizedRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const liveRole = role ?? normalizedRole;

  useEffect(() => {
    if (!user) return;

    const check = () => {
      if (!canAccessRoute(liveRole, location.pathname)) {
        navigate(getRoleRedirect(liveRole), { replace: true });
      }
    };

    check();

    const onRoleUpdated = () => check();
    window.addEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
    return () => window.removeEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
  }, [user, liveRole, normalizedRole, role, location.pathname, navigate]);

  return <>{children}</>;
}
