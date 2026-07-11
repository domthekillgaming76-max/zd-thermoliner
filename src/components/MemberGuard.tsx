import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppModules } from '../contexts/AppModulesContext';
import {
  canAccessSalon,
  getAccessDeniedReason,
  getDefaultLandingPath,
  VISITOR_RESTRICTED_MESSAGE,
} from '../lib/accessService';
import { ROLE_SYNC_EVENT } from '../lib/roleEngine';
import { logAccessAttempt } from '../services/securityLogService';

interface MemberGuardProps {
  children: ReactNode;
  page: string;
}

export function MemberGuard({ children, page }: MemberGuardProps) {
  const { profile, user, role, normalizedRole } = useAuth();
  const { rooms } = useAppModules();
  const location = useLocation();
  const email = user?.email ?? profile?.email;
  const liveRole = role ?? profile?.role ?? normalizedRole;

  const allowed = profile
    ? canAccessSalon({
        role: liveRole,
        email,
        moduleOrPage: page,
        pathname: location.pathname,
        rooms,
        isActive: profile.is_active,
        isSuspended: profile.is_suspended,
      })
    : true;

  useEffect(() => {
    if (profile && !allowed) {
      void logAccessAttempt({
        userId: profile.id,
        email: profile.email,
        page,
        allowed: false,
        reason: getAccessDeniedReason({
          role: liveRole,
          email: profile.email,
          moduleOrPage: page,
          pathname: location.pathname,
          isActive: profile.is_active,
          isSuspended: profile.is_suspended,
        }),
      });
    }
  }, [profile, allowed, page, liveRole, location.pathname]);

  useEffect(() => {
    const onRoleUpdated = () => {
      if (!profile) return;
      canAccessSalon({
        role: liveRole,
        email,
        moduleOrPage: page,
        pathname: location.pathname,
        rooms,
      });
    };
    window.addEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
    return () => window.removeEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
  }, [profile, liveRole, email, page, location.pathname, rooms]);

  if (profile && !allowed) {
    const redirectTo = !user ? '/login' : getDefaultLandingPath(liveRole);
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          accessDenied: getAccessDeniedReason({
            role: liveRole,
            email: profile.email,
            moduleOrPage: page,
            pathname: location.pathname,
            isActive: profile.is_active,
            isSuspended: profile.is_suspended,
          }) || VISITOR_RESTRICTED_MESSAGE,
          from: location.pathname,
        }}
      />
    );
  }

  return <>{children}</>;
}
