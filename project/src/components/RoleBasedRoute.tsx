import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LEVELS } from '../contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'pdg' | 'patron' | 'directeur' | 'dispatcher' | 'chauffeur' | 'tractionnaire' | 'candidat';
  page: string;
}

export function RoleBasedRoute({ children, requiredRole, page }: RoleBasedRouteProps) {
  const { user, profile, loading } = useAuth();

  // Still loading auth state — show spinner, never redirect
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

  // No user — go to login
  if (!user) return <Navigate to="/login" replace />;

  // User authenticated but profile not yet fetched — keep waiting
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

  // Banned → suspended page only
  if (profile.role === 'banni' && page !== 'suspended') {
    return <Navigate to="/suspended" replace />;
  }

  // Former member → departed page only (settings allowed for contact)
  if (profile.role === 'ancien_membre' && page !== 'departed' && page !== 'settings') {
    return <Navigate to="/departed" replace />;
  }

  // Candidat → join page only
  if (profile.role === 'candidat' && page !== 'join') {
    return <Navigate to="/join" replace />;
  }

  // Authenticated approved user trying to reach join → dashboard
  if (!['candidat', 'banni', 'ancien_membre'].includes(profile.role) && page === 'join') {
    return <Navigate to="/dashboard" replace />;
  }

  const userLevel = ROLE_LEVELS[profile.role as keyof typeof ROLE_LEVELS] || 0;

  // Specific role requirement
  if (requiredRole) {
    const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
    if (userLevel < requiredLevel) {
      if (profile.role === 'candidat') return <Navigate to="/join" replace />;
      if (profile.role === 'tractionnaire') return <Navigate to="/road-sheets" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Page-level access check
  const pageRules: Record<string, number> = {
    join: 0, dashboard: 30, wall: 30, chat: 30, ranking: 30,
    fleet: 30, road_sheets: 20, bank: 30, economy: 30, profile: 20,
    settings: 20, drivers: 70, garages: 70, company: 90, admin: 90, candidatures: 90,
    freight: 20, convoys: 20, departed: 5, suspended: 0, updates: 20,
  };
  const required = pageRules[page] ?? 100;
  if (userLevel < required) {
    if (profile.role === 'candidat') return <Navigate to="/join" replace />;
    if (profile.role === 'tractionnaire') return <Navigate to="/road-sheets" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
