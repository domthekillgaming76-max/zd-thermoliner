import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchDashboardData } from '../services/dashboardService';
import { queryKeys } from '../lib/queryKeys';
import { supabase } from '../lib/supabase';
import type { DashboardData } from '../types/dashboard';

import { PERF } from '../lib/perfConfig';

const DASHBOARD_POLL_MS = PERF.dashboardPollMs;

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
    staleTime: 10_000,
    refetchInterval: DASHBOARD_POLL_MS,
    refetchOnWindowFocus: true,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dashboard_rt_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_bank_account' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_missions' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trucks' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freight_offers' }, () => query.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_presence' }, () => query.refetch())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [userId, query.refetch]);

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
