import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { useLiveOpsMetrics, useFleetMap } from '../hooks/useLiveOps';
import { isDriverRole } from '../lib/accessControl';
import { DriverSalarySummary } from '../components/liveops/DriverSalarySummary';
import { FleetCommandCenter } from '../components/erp/dashboard/FleetCommandCenter';

const EMPTY_LIVE_OPS = {
  connectedDrivers: 0,
  deliveriesInProgress: 0,
  revenueToday: 0,
  expensesToday: 0,
  netProfitToday: 0,
  pendingRoadSheets: 0,
  activeFreightOffers: 0,
  systemStatus: 'ok' as const,
  systemMessage: 'Systèmes opérationnels',
  lastUpdated: new Date().toISOString(),
};

export function DashboardPage() {
  const { profile, user } = useAuth();
  const data = useDashboardData(user?.id);
  const { refresh, lastUpdated, isRefreshing } = useDashboardRefresh(data.refresh, data.isFetching);
  const liveOps = useLiveOpsMetrics();
  const fleetMap = useFleetMap(user?.id, profile?.role, user?.email);

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';
  const isDriver = isDriverRole(profile?.role);

  return (
    <Layout>
      <FleetCommandCenter
        displayName={displayName}
        data={data}
        loading={data.loading}
        liveOps={liveOps.data ?? EMPTY_LIVE_OPS}
        fleetMap={fleetMap.data ?? []}
        onRefresh={refresh}
        refreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      {isDriver && user?.id && (
        <section className="fleet-glass-card p-5 sm:p-6 mb-8">
          <DriverSalarySummary userId={user.id} />
        </section>
      )}
    </Layout>
  );
}
