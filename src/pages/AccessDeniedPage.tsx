import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function CandidateRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // If user is approved (not candidat), redirect to dashboard
  if (profile && profile.role !== 'candidat') {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise show join page (imported separately to avoid circular deps)
  return <Navigate to="/join" replace />;
}
