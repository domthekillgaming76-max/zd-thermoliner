import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import {
  useDashboardMetrics,
  useExecutiveHighlights,
} from '../hooks/useDashboardMetrics';
import { useLiveOpsMetrics, useFleetMap } from '../hooks/useLiveOps';
import { fmtEuro } from '../lib/format';
import { canAccessBank } from '../lib/bankPermissions';
import {
  canAccessLiveOps,
  canAccessFleetMap,
} from '../lib/phase5Permissions';
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

const EMPTY_LIVE_OPS = {
  connectedDrivers: 0,
  deliveriesInProgress: 0,
  revenueToday: 0,
  expensesToday: 0,
  netProfitToday: 0,
  pendingRoadSheets: 0,
  activeFreightOffers: 0,
  systemStatus: 'ok' as const,
  systemMessage: 'Chargement des opérations...',
  lastUpdated: new Date().toISOString(),
};

export function DashboardPage() {
  const { profile, user } = useAuth();

  const data = useDashboardData(user?.id);

  const { refresh, lastUpdated, isRefreshing } = useDashboardRefresh(
    data.refresh,
    data.isFetching,
  );

  const showBank = canAccessBank(
    profile?.role,
    user?.email ?? profile?.email,
  );

  const showLiveOps = canAccessLiveOps(
    profile?.role,
    user?.email,
  );

  const showFleetMap = canAccessFleetMap(
    profile?.role,
    user?.email,
  );

  const isDriver = isDriverRole(profile?.role);

  const metrics = useDashboardMetrics(
    data.stats,
    data.trends,
    fmtEuro,
    showBank,
  );

  const highlights = useExecutiveHighlights(data, fmtEuro);
  const liveOps = useLiveOpsMetrics();

  const fleetMap = useFleetMap(
    user?.id,
    profile?.role,
    user?.email,
  );

  const displayName =
    profile?.pseudo ||
    profile?.full_name ||
    'Membre';

  return (
    <Layout>
      <main className="mx-auto w-full max-w-[1600px] space-y-8 pb-10 md:space-y-10">
        <DashboardBureauxHeroBanner />

        <PremiumDashboardHero
          greeting={`Bonjour, ${displayName}`}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />

        {showLiveOps && (
          <DashboardSection
            title="Centre des opérations"
            subtitle="Suivi en direct de l'activité Z&D Thermoliner"
          >
            <DashboardWidget delay={40}>
              <LiveOpsPanel
                metrics={liveOps.data ?? EMPTY_LIVE_OPS}
                loading={liveOps.isLoading}
                onRefresh={() => liveOps.refetch()}
                refreshing={liveOps.isFetching}
              />
            </DashboardWidget>
          </DashboardSection>
        )}

        <DashboardSection
          title="Résumé de l'entreprise"
          subtitle="Les informations essentielles en un coup d'œil"
        >
          <ExecutiveSummary
            highlights={highlights}
            loading={data.loading}
          />
        </DashboardSection>

        <DashboardSection
          title="Indicateurs clés"
          subtitle="Performances financières et opérationnelles"
        >
          <MetricsGrid
            metrics={metrics}
            loading={data.loading}
          />
        </DashboardSection>

        {isDriver && user?.id && (
          <DashboardSection
            title="Espace chauffeur"
            subtitle="Votre rémunération et votre activité"
          >
            <DashboardWidget delay={60}>
              <DriverSalarySummary userId={user.id} />
            </DashboardWidget>
          </DashboardSection>
        )}

        <DashboardSection
          title="Performance hebdomadaire"
          subtitle="Livraisons et résultats des sept derniers jours"
        >
          <DashboardWidget delay={60}>
            <WeeklyPerformance
              data={data.weeklyData}
              operational={data.operational}
              loading={data.loading}
              fmtEuro={fmtEuro}
            />
          </DashboardWidget>
        </DashboardSection>

        <DashboardSection
          title="Opérations et flotte"
          subtitle="Activité récente et état des véhicules"
        >
          <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
            <DashboardWidget
              delay={60}
              className="lg:col-span-2"
            >
              <OperationsHub
                roadSheets={data.recentRoadSheets}
                transactions={data.recentTransactions}
                loading={data.loading}
              />
            </DashboardWidget>

            <DashboardWidget delay={100}>
              <FleetHealthCard
                fleet={data.fleetStatus}
                maintenanceTrucks={data.maintenanceTrucks}
                loading={data.loading}
              />
            </DashboardWidget>
          </div>
        </DashboardSection>

        {showFleetMap && (
          <DashboardSection
            title="Carte de la flotte"
            subtitle="Position et disponibilité des véhicules"
          >
            <DashboardWidget delay={60}>
              <FleetMapPanel
                vehicles={fleetMap.data ?? []}
                loading={fleetMap.isLoading}
                compact
              />
            </DashboardWidget>
          </DashboardSection>
        )}

        <DashboardSection
          title="Équipe et alertes"
          subtitle="Classement des chauffeurs et notifications importantes"
        >
          <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
            <DashboardWidget delay={60}>
              <TeamLeaderboard
                drivers={data.topDrivers}
                loading={data.loading}
              />
            </DashboardWidget>

            <DashboardWidget delay={100}>
              <AlertsPanel
                notifications={data.notifications}
                maintenanceTrucks={data.maintenanceTrucks}
                loading={data.loading}
              />
            </DashboardWidget>
          </div>
        </DashboardSection>

        {showBank && (
          <DashboardSection
            title="Finances de l'entreprise"
            subtitle="Résultats mensuels et répartition des dépenses"
          >
            <div className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-3">
              <DashboardWidget
                delay={60}
                className="xl:col-span-2"
              >
                <FinanceAnalytics
                  data={data.monthData}
                  loading={data.loading}
                  revenueMonth={data.stats.revenueMonth}
                  expensesMonth={data.stats.expensesMonth}
                  netProfit={data.stats.netProfit}
                  fmtEuro={fmtEuro}
                />
              </DashboardWidget>

              <DashboardWidget delay={100}>
                <ExpenseBreakdownPanel
                  breakdown={data.expenseBreakdown}
                  loading={data.loading}
                  fmtEuro={fmtEuro}
                />
              </DashboardWidget>
            </div>
          </DashboardSection>
        )}

        <DashboardSection
          title="La vie chez Z&D"
          subtitle="Photos, événements et moments de l'entreprise"
        >
          <DashboardRpGallery />
        </DashboardSection>

        <DashboardSection
          title="Accès rapide"
          subtitle="Accédez directement aux différents modules de l'ERP"
        >
          <DashboardWidget delay={40}>
            <ModuleShortcuts />
          </DashboardWidget>
        </DashboardSection>
      </main>
    </Layout>
  );
}