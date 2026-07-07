import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/dashboardService';
import { queryKeys } from '../lib/queryKeys';
import type { DashboardData } from '../types/dashboard';

const EMPTY: DashboardData = {
  stats: {
    revenueToday: 0,
    revenueMonth: 0,
    companyBalance: 0,
    netProfit: 0,
    expensesMonth: 0,
    driverCount: 0,
    trucksAvailable: 0,
    pendingRoadSheets: 0,
    deliveriesCompleted: 0,
  },
  trends: {
    revenueTodayChange: 0,
    revenueMonthChange: 0,
    profitMargin: 0,
    fleetUtilization: 0,
    validationRate: 0,
    expenseRatio: 0,
  },
  expenseBreakdown: { fuel: 0, tolls: 0, repairs: 0, salaries: 0, other: 0 },
  operational: {
    avgRevenuePerDelivery: 0,
    totalKmMonth: 0,
    activeAssignments: 0,
    pendingValidations: 0,
    completedToday: 0,
  },
  weeklyData: [],
  fleetStatus: { total: 0, active: 0, maintenance: 0, retired: 0, available: 0 },
  monthData: [],
  recentRoadSheets: [],
  recentTransactions: [],
  notifications: [],
  maintenanceTrucks: [],
  topDrivers: [],
  trucks: [],
  drivers: [],
};

export function useDashboardData(userId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.dashboard(userId),
    queryFn: () => fetchDashboardData(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const data = query.data ?? EMPTY;

  return {
    ...data,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? 'Impossible de charger le tableau de bord.' : null,
    refresh: query.refetch,
  };
}

export type {
  DashboardData,
  DashboardStats,
  DashboardTrends,
  FleetStatus,
  DashboardNotification,
  ExpenseBreakdown,
  OperationalMetrics,
  WeeklyDataPoint,
} from '../types/dashboard';
