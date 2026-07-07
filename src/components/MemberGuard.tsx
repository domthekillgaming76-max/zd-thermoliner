import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  canAccessPage,
  getAccessDeniedReason,
  VISITOR_RESTRICTED_MESSAGE,
} from '../lib/accessControl';
import { logAccessAttempt } from '../services/securityLogService';

interface MemberGuardProps {
  children: ReactNode;
  page: string;
}

export function MemberGuard({ children, page }: MemberGuardProps) {
  const { profile, user } = useAuth();
  const location = useLocation();

  const allowed = profile
    ? canAccessPage(profile.role, page, {
        email: user?.email ?? profile.email,
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
        reason: getAccessDeniedReason(profile.role, page, {
          email: profile.email,
          isActive: profile.is_active,
          isSuspended: profile.is_suspended,
        }),
      });
    }
  }, [profile, allowed, page]);

  if (profile && !allowed) {
    return (
      <Navigate
        to="/wall"
        replace
        state={{
          accessDenied: getAccessDeniedReason(profile.role, page, {
            email: profile.email,
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
