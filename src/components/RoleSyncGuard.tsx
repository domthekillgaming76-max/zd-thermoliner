import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessRoute, getRoleRedirect, ROLE_SYNC_EVENT } from '../lib/roleEngine';

interface RoleSyncGuardProps {
  children: ReactNode;
}

/** Live route guard — redirects when role change revokes current page access */
export function RoleSyncGuard({ children }: RoleSyncGuardProps) {
  const { profile, normalizedRole, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile || !user) return;

    const check = () => {
      if (!canAccessRoute(normalizedRole, location.pathname)) {
        navigate(getRoleRedirect(profile.role ?? normalizedRole), { replace: true });
      }
    };

    check();

    const onRoleUpdated = () => check();
    window.addEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
    return () => window.removeEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
  }, [profile, user, normalizedRole, location.pathname, navigate]);

  return <>{children}</>;
}
