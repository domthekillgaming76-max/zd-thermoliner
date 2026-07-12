import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { useDashboardMetrics, useExecutiveHighlights } from '../hooks/useDashboardMetrics';
import { useLiveOpsMetrics, useFleetMap } from '../hooks/useLiveOps';
import { fmtEuro } from '../lib/format';
import { canAccessBank } from '../lib/bankPermissions';
import { canAccessLiveOps, canAccessFleetMap } from '../lib/phase5Permissions';
import { isDriverRole } from '../lib/accessControl';
import { LiveOpsPanel } from '../components/liveops/LiveOpsPanel';
import { FleetMapPanel } from '../components/liveops/FleetMapPanel';
import { DriverSalarySummary } from '../components/liveops/DriverSalarySummary';
import {
  PremiumDashboardHero,
  DashboardBureauxHeroBanner,
  DashboardRpGallery,
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
  DashboardSection,
  DashboardWidget,
} from '../components/erp/dashboard/premium';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const data = useDashboardData(user?.id);
  const { refresh, lastUpdated, isRefreshing } = useDashboardRefresh(data.refresh, data.isFetching);
  const showBank = canAccessBank(profile?.role, user?.email ?? profile?.email);
  const showLiveOps = canAccessLiveOps(profile?.role, user?.email);
  const showFleetMap = canAccessFleetMap(profile?.role, user?.email);
  const isDriver = isDriverRole(profile?.role);
  const metrics = useDashboardMetrics(data.stats, data.trends, fmtEuro, showBank);
  const highlights = useExecutiveHighlights(data, fmtEuro);
  const liveOps = useLiveOpsMetrics();
  const fleetMap = useFleetMap(user?.id, profile?.role, user?.email);

  const displayName = profile?.pseudo || profile?.full_name || 'Membre';

  return (
    <Layout>
      <div className="space-y-8 md:space-y-10 pb-6 max-w-[1600px]">
        <DashboardBureauxHeroBanner />

        <PremiumDashboardHero
          greeting={`Bonjour, ${displayName}`}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />

        <DashboardRpGallery />

        <DashboardSection title="Résumé exécutif" subtitle="Les chiffres essentiels en un coup d'œil">
          <ExecutiveSummary highlights={highlights} loading={data.loading} />
        </DashboardSection>

        {showLiveOps && (
          <DashboardSection title="Opérations en direct" subtitle="Activité temps réel de la flotte">
            <DashboardWidget delay={80}>
              <LiveOpsPanel
                metrics={liveOps.data ?? {
                  connectedDrivers: 0, deliveriesInProgress: 0, revenueToday: 0, expensesToday: 0,
                  netProfitToday: 0, pendingRoadSheets: 0, activeFreightOffers: 0,
                  systemStatus: 'ok', systemMessage: 'Chargement...', lastUpdated: new Date().toISOString(),
                }}
                loading={liveOps.isLoading}
                onRefresh={() => liveOps.refetch()}
                refreshing={liveOps.isFetching}
              />
            </DashboardWidget>
          </DashboardSection>
        )}

        {isDriver && (
          <DashboardWidget delay={100}>
            <DriverSalarySummary userId={user?.id} />
          </DashboardWidget>
        )}

        <DashboardSection title="Indicateurs clés" subtitle="KPIs financiers et opérationnels">
          <MetricsGrid metrics={metrics} loading={data.loading} />
        </DashboardSection>

        <DashboardSection title="Finances" subtitle="Performance et répartition des dépenses">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
            <DashboardWidget delay={60} className="xl:col-span-2">
              <FinanceAnalytics
                data={data.monthData}
                loading={data.loading}
                revenueMonth={data.stats.revenueMonth}
                expensesMonth={data.stats.expensesMonth}
                netProfit={data.stats.netProfit}
                fmtEuro={fmtEuro}
              />
            </DashboardWidget>
            <DashboardWidget delay={120}>
              <ExpenseBreakdownPanel
                breakdown={data.expenseBreakdown}
                loading={data.loading}
                fmtEuro={fmtEuro}
              />
            </DashboardWidget>
          </div>
        </DashboardSection>

        <DashboardSection title="Performance hebdomadaire" subtitle="Livraisons et revenus sur 7 jours">
          <DashboardWidget delay={80}>
            <WeeklyPerformance
              data={data.weeklyData}
              operational={data.operational}
              loading={data.loading}
              fmtEuro={fmtEuro}
            />
          </DashboardWidget>
        </DashboardSection>

        <DashboardSection title="Opérations & flotte" subtitle="Activité récente et état des véhicules">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            <DashboardWidget delay={60} className="lg:col-span-2">
              <OperationsHub
                roadSheets={data.recentRoadSheets}
                transactions={data.recentTransactions}
                loading={data.loading}
              />
            </DashboardWidget>
            <DashboardWidget delay={120}>
              <FleetHealthCard
                fleet={data.fleetStatus}
                maintenanceTrucks={data.maintenanceTrucks}
                loading={data.loading}
              />
            </DashboardWidget>
          </div>
        </DashboardSection>

        <DashboardSection title="Équipe & alertes" subtitle="Classement chauffeurs et notifications">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <DashboardWidget delay={60}>
              <TeamLeaderboard drivers={data.topDrivers} loading={data.loading} />
            </DashboardWidget>
            <DashboardWidget delay={120}>
              <AlertsPanel
                notifications={data.notifications}
                maintenanceTrucks={data.maintenanceTrucks}
                loading={data.loading}
              />
            </DashboardWidget>
          </div>
        </DashboardSection>

        {showFleetMap && (
          <DashboardSection title="Carte flotte" subtitle="Position des véhicules">
            <DashboardWidget delay={80}>
              <FleetMapPanel
                vehicles={fleetMap.data ?? []}
                loading={fleetMap.isLoading}
                compact
              />
            </DashboardWidget>
          </DashboardSection>
        )}

        <DashboardSection title="Accès rapide" subtitle="Raccourcis vers les modules ERP">
          <DashboardWidget delay={60}>
            <ModuleShortcuts />
          </DashboardWidget>
        </DashboardSection>
      </div>
    </Layout>
  );
}
