import { Map, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FleetMapPanel } from '../components/liveops/FleetMapPanel';
import { useAuth } from '../contexts/AuthContext';
import { useFleetMap } from '../hooks/useLiveOps';
import { canAccessFleetMap } from '../lib/phase5Permissions';
import { Navigate } from 'react-router-dom';

export function FleetMapPage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessFleetMap(profile?.role, user?.email);
  const { data: vehicles = [], isLoading, refetch, isFetching } = useFleetMap(user?.id, profile?.role, user?.email);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé à la carte flotte.' }} />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <PageHeader title="Carte flotte live" subtitle="Positions chauffeurs et camions en temps réel" icon={Map} />
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        <FleetMapPanel
          vehicles={vehicles}
          loading={isLoading}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
      </div>
    </Layout>
  );
}
