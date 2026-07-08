import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { useDashboardMetrics, useExecutiveHighlights } from '../hooks/useDashboardMetrics';
import { fmtEuro } from '../lib/format';
import { canAccessBank } from '../lib/bankPermissions';
import {
  PremiumDashboardHero,
  ExecutiveSummary,
  MetricsGrid,
  FinanceAnalytics,
  ExpenseBreakdownPanel,
  OperationsHub,
  FleetHealthCard,
  TeamLeaderboard,
  AlertsPanel,
  ModuleShortcuts,
  WeeklyPerformance,
} from '../components/erp/dashboard/premium';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const data = useDashboardData(user?.id);
  const { refresh, lastUpdated, isRefreshing } = useDashboardRefresh(data.refresh, data.isFetching);
  const showBank = canAccessBank(profile?.role, user?.email ?? profile?.email);
  const metrics = useDashboardMetrics(data.stats, data.trends, fmtEuro, showBank);
  const highlights = useExecutiveHighlights(data, fmtEuro);

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';

  return (
    <Layout>
      <div className="space-y-5 md:space-y-6 animate-fade-in pb-4">
        <PremiumDashboardHero
          greeting={`Bonjour, ${displayName}`}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />

        <ExecutiveSummary highlights={highlights} loading={data.loading} />

        <MetricsGrid metrics={metrics} loading={data.loading} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
          <div className="xl:col-span-2">
            <FinanceAnalytics
              data={data.monthData}
              loading={data.loading}
              revenueMonth={data.stats.revenueMonth}
              expensesMonth={data.stats.expensesMonth}
              netProfit={data.stats.netProfit}
              fmtEuro={fmtEuro}
            />
          </div>
          <ExpenseBreakdownPanel
            breakdown={data.expenseBreakdown}
            loading={data.loading}
            fmtEuro={fmtEuro}
          />
        </div>

        <WeeklyPerformance
          data={data.weeklyData}
          operational={data.operational}
          loading={data.loading}
          fmtEuro={fmtEuro}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          <div className="lg:col-span-2">
            <OperationsHub
              roadSheets={data.recentRoadSheets}
              transactions={data.recentTransactions}
              loading={data.loading}
            />
          </div>
          <FleetHealthCard
            fleet={data.fleetStatus}
            maintenanceTrucks={data.maintenanceTrucks}
            loading={data.loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <TeamLeaderboard drivers={data.topDrivers} loading={data.loading} />
          <AlertsPanel
            notifications={data.notifications}
            maintenanceTrucks={data.maintenanceTrucks}
            loading={data.loading}
          />
        </div>

        <ModuleShortcuts />
      </div>
    </Layout>
  );
}
