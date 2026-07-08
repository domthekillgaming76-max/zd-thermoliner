import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessPage, getAccessDeniedRedirect, getPostLoginPath } from '../lib/accessControl';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'pdg' | 'patron' | 'directeur' | 'dispatcher' | 'chauffeur' | 'tractionnaire' | 'candidat';
  page: string;
}

export function RoleBasedRoute({ children, requiredRole, page }: RoleBasedRouteProps) {
  const { user, profile, loading } = useAuth();

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

  if (profile.role === 'candidat' && page !== 'join') {
    return <Navigate to="/join" replace />;
  }

  if (!['candidat', 'banni', 'ancien_membre'].includes(profile.role) && page === 'join') {
    return <Navigate to={getPostLoginPath(profile.role)} replace />;
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={getAccessDeniedRedirect(profile.role, page)} replace />;
  }

  const allowed = canAccessPage(profile.role, page, {
    email: user.email ?? profile.email,
    isActive: profile.is_active,
    isSuspended: profile.is_suspended,
  });

  if (!allowed) {
    return <Navigate to={getAccessDeniedRedirect(profile.role, page)} replace />;
  }

  return <>{children}</>;
}
