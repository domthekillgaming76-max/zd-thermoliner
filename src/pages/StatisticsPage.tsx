import { BarChart3, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert } from '../components/erp/FormAlert';
import { StatisticsCharts } from '../components/statistics/StatisticsCharts';
import { useAuth } from '../contexts/AuthContext';
import { useStatistics } from '../hooks/useStatistics';
import { canAccessStatistics } from '../lib/phase5Permissions';

export function StatisticsPage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessStatistics(profile?.role, user?.email);
  const { data, isLoading, isError, error, refetch, isFetching } = useStatistics();

  if (!canAccess) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé aux statistiques avancées.' }} />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <PageHeader title="Statistiques avancées" subtitle="Analyses performance, routes et marges" icon={BarChart3} />
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur chargement.'} />}

        {isLoading ? (
          <div className="erp-card rounded-2xl h-96 shimmer" />
        ) : data ? (
          <StatisticsCharts data={data} />
        ) : null}
      </div>
    </Layout>
  );
}
