import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  canAccessPage,
  getAccessDeniedReason,
  VISITOR_RESTRICTED_MESSAGE,
} from '../lib/accessControl';
import { isAdministratorEmail } from '../lib/admin';
import {
  type ModuleKey,
  canAccessModule,
  canAccessRoute,
  getRoleRedirect,
  ROLE_SYNC_EVENT,
} from '../lib/roleEngine';
import { logAccessAttempt } from '../services/securityLogService';

interface MemberGuardProps {
  children: ReactNode;
  page: string;
}

const MODULE_PAGES = new Set<string>([
  'wall', 'profile', 'recruitment', 'recruitment_applications', 'dashboard',
  'road_sheets', 'freight_market', 'dispatch', 'gps_tracking', 'fleet', 'maintenance',
  'drivers', 'reports', 'finance', 'invoices', 'salaries', 'accounting', 'bank',
  'administration', 'settings', 'updates', 'events', 'training_center', 'driver_portal',
  'documents', 'notifications', 'fleet_map', 'statistics', 'assistant', 'garages', 'clients',
]);

function isModulePage(page: string): page is ModuleKey {
  return MODULE_PAGES.has(page);
}

export function MemberGuard({ children, page }: MemberGuardProps) {
  const { profile, user, role, normalizedRole } = useAuth();
  const location = useLocation();
  const email = user?.email ?? profile?.email;
  const liveRole = role ?? profile?.role ?? normalizedRole;

  const legacyAllowed = profile
    ? canAccessPage(liveRole, page, {
        email,
        isActive: profile.is_active,
        isSuspended: profile.is_suspended,
      })
    : true;

  const engineModuleAllowed = isModulePage(page)
    ? canAccessModule(liveRole, page)
    : true;

  const engineRouteAllowed = canAccessRoute(liveRole, location.pathname);

  const allowed = isAdministratorEmail(email)
    ? legacyAllowed
    : legacyAllowed && engineModuleAllowed && engineRouteAllowed;

  useEffect(() => {
    if (profile && !allowed) {
      void logAccessAttempt({
        userId: profile.id,
        email: profile.email,
        page,
        allowed: false,
        reason: getAccessDeniedReason(liveRole, page, {
          email: profile.email,
          isActive: profile.is_active,
          isSuspended: profile.is_suspended,
        }),
      });
    }
  }, [profile, allowed, page]);

  useEffect(() => {
    const onRoleUpdated = () => {
      if (!profile) return;
      if (!canAccessRoute(liveRole, location.pathname)) {
        // Navigate handled by RoleSyncGuard; guard re-renders on context update
      }
    };
    window.addEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
    return () => window.removeEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
  }, [profile, liveRole, normalizedRole, location.pathname]);

  if (profile && !allowed) {
    const redirectTo = !user
      ? '/login'
      : getRoleRedirect(liveRole);

    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          accessDenied: getAccessDeniedReason(liveRole, page, {
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
