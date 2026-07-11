import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppModules } from '../contexts/AppModulesContext';
import { canAccessPage, getAccessDeniedRedirect, getPostLoginPath } from '../lib/accessControl';
import { isAdministratorEmail } from '../lib/admin';
import { getRoleRedirect, pathnameToModule, normalizeRole, type AppRole } from '../lib/roleEngine';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  /** Rôle requis (canonique uniquement) */
  requiredRole?: AppRole;
  page: string;
}

export function RoleBasedRoute({ children, requiredRole, page }: RoleBasedRouteProps) {
  const { user, profile, loading, role, normalizedRole } = useAuth();
  const { canAccessModuleKey, isModuleEnabledKey, isRouteEnabledPath } = useAppModules();
  const location = useLocation();
  const liveRole = role ?? profile?.role ?? normalizedRole;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-red-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Chargement Z&D...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-red-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Chargement du profil Z&D...</p>
        </div>
      </div>
    );
  }

  if (profile.role === 'banni' && page !== 'suspended') {
    return <Navigate to="/suspended" replace />;
  }

  if (profile.role === 'ancien_membre' && page !== 'departed' && page !== 'settings') {
    return <Navigate to="/departed" replace />;
  }

  if (normalizeRole(profile.role) === 'visiteur' && profile.application_status === 'pending' && page !== 'join') {
    return <Navigate to="/join" replace />;
  }

  if (page === 'join' && normalizeRole(profile.role) !== 'visiteur') {
    return <Navigate to={getPostLoginPath(profile.role)} replace />;
  }

  if (requiredRole && normalizeRole(profile.role) !== requiredRole) {
    return <Navigate to={getAccessDeniedRedirect(profile.role, page)} replace />;
  }

  const email = user.email ?? profile.email;
  const legacyAllowed = canAccessPage(liveRole, page, {
    email,
    isActive: profile.is_active,
    isSuspended: profile.is_suspended,
  });

  const moduleKey = pathnameToModule(location.pathname) ?? page;
  const configAllowed = moduleKey
    ? canAccessModuleKey(moduleKey) && isModuleEnabledKey(moduleKey)
    : true;
  const routeEnabled = isRouteEnabledPath(location.pathname);

  const allowed = isAdministratorEmail(email)
    ? legacyAllowed && routeEnabled
    : legacyAllowed && configAllowed && routeEnabled;

  if (!allowed) {
    return <Navigate to={getRoleRedirect(liveRole)} replace />;
  }

  return <>{children}</>;
}
