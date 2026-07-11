import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppModules } from '../contexts/AppModulesContext';
import { canAccessPath, getDefaultLandingPath } from '../lib/accessService';
import { ROLE_SYNC_EVENT } from '../lib/roleEngine';

interface RoleSyncGuardProps {
  children: ReactNode;
}

/** Redirection live quand le rôle révoque l'accès à la page courante */
export function RoleSyncGuard({ children }: RoleSyncGuardProps) {
  const { user, profile, role, normalizedRole } = useAuth();
  const { rooms } = useAppModules();
  const location = useLocation();
  const navigate = useNavigate();
  const liveRole = role ?? profile?.role ?? normalizedRole;
  const email = user?.email ?? profile?.email;

  useEffect(() => {
    if (!user) return;

    const check = () => {
      const allowed = canAccessPath({
        role: liveRole,
        email,
        pathname: location.pathname,
        rooms,
        isActive: profile?.is_active,
        isSuspended: profile?.is_suspended,
      });
      if (!allowed) {
        navigate(getDefaultLandingPath(liveRole), { replace: true });
      }
    };

    check();

    const onRoleUpdated = () => check();
    window.addEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
    return () => window.removeEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
  }, [user, liveRole, email, role, location.pathname, navigate, rooms, profile?.is_active, profile?.is_suspended]);

  return <>{children}</>;
}
