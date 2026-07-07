import { supabase, Transaction, RoadSheet, Truck, Driver } from '../lib/supabase';

import { monthKey, todayKey } from '../lib/format';

import {

  computeExpenseBreakdownFromTransactions,

  computeTransactionFinancials,

  buildMonthChartFromTransactions,

} from '../lib/transactionAnalytics';

import type {

  DashboardData,

  DashboardNotification,

  DashboardStats,

  FleetStatus,

} from '../types/dashboard';

import {

  buildWeeklyChart,

  computeOperationalMetrics,

  computeTrends,

} from './dashboardAnalytics';

import { syncValidatedRoadSheetsToBank } from './bankService';

import { fetchAllTransactions } from '../lib/transactionSchema';



function computeStats(

  transactions: Transaction[],

  sheets: RoadSheet[],

  drivers: Driver[],

  trucks: Truck[],

  accountBalance: number | null,

): { stats: DashboardStats; fleetStatus: FleetStatus } {

  const today = todayKey();

  const month = monthKey();

  const financials = computeTransactionFinancials(transactions, accountBalance, month, today);



  const active = trucks.filter(t => t.status === 'active').length;

  const maintenance = trucks.filter(t => t.status === 'maintenance').length;

  const retired = trucks.filter(t => t.status === 'retired').length;



  return {

    stats: {

      revenueToday: financials.revenueToday,

      revenueMonth: financials.revenueMonth,

      companyBalance: financials.balance,

      netProfit: financials.netProfit,

      expensesMonth: financials.expensesMonth,

      driverCount: drivers.filter(d => d.status === 'active').length,

      trucksAvailable: trucks.filter(t => t.status === 'active' && !t.driver_id).length,

      pendingRoadSheets: sheets.filter(s => !s.validated && s.status !== 'rejected').length,

      deliveriesCompleted: sheets.filter(s => s.validated).length,

    },

    fleetStatus: {

      total: trucks.length,

      active,

      maintenance,

      retired,

      available: trucks.filter(t => t.status === 'active' && !t.driver_id).length,

    },

  };

}



async function fetchNotifications(userId: string): Promise<DashboardNotification[]> {

  try {

    const { data } = await supabase

      .from('notifications')

      .select('id, title, message, read, type, created_at')

      .eq('user_id', userId)

      .order('created_at', { ascending: false })

      .limit(8);

    return (data ?? []) as DashboardNotification[];

  } catch {

    return [];

  }

}



export async function fetchDashboardData(userId?: string): Promise<DashboardData> {
  try {
    await syncValidatedRoadSheetsToBank();
  } catch (syncError) {
    console.error('[Z&D] bank sync error on dashboard load:', syncError);
  }

  const [
    transactions,
    sheetsRes,
    driversRes,
    trucksRes,
    recentSheetsRes,
    recentTransactions,
    accountRes,
  ] = await Promise.all([
    fetchAllTransactions({ orderBy: 'date', ascending: false }),
    supabase.from('road_sheets').select('*'),
    supabase.from('drivers').select('*'),
    supabase.from('trucks').select('*'),
    supabase.from('road_sheets').select('*').order('created_at', { ascending: false }).limit(8),
    fetchAllTransactions({ orderBy: 'created_at', ascending: false, limit: 8 }),
    supabase.from('company_bank_account').select('balance').limit(1).maybeSingle(),
  ]);

  const sheets = (sheetsRes.data ?? []) as RoadSheet[];

  const drivers = (driversRes.data ?? []) as Driver[];

  const trucks = (trucksRes.data ?? []) as Truck[];

  const recentRoadSheets = (recentSheetsRes.data ?? []) as RoadSheet[];

  const today = todayKey();

  const month = monthKey();

  const validatedSheets = sheets.filter(s => s.validated);

  const monthSheets = validatedSheets.filter(s => s.date?.startsWith(month));

  const todaySheets = validatedSheets.filter(s => s.date?.startsWith(today));



  const { stats, fleetStatus } = computeStats(

    transactions,

    sheets,

    drivers,

    trucks,

    accountRes.data?.balance != null ? Number(accountRes.data.balance) : null,

  );

  const maintenanceTrucks = trucks.filter(t => t.status === 'maintenance');

  const notifications = userId ? await fetchNotifications(userId) : [];

  const topDrivers = [...drivers]

    .sort((a, b) => (b.deliveries_count ?? 0) - (a.deliveries_count ?? 0) || b.total_km - a.total_km)

    .slice(0, 5);



  const trends = computeTrends(

    transactions,

    month,

    today,

    stats.revenueToday,

    stats.revenueMonth,

    stats.expensesMonth,

    fleetStatus.total,

    fleetStatus.active,

    sheets,

  );



  return {

    stats,

    trends,

    expenseBreakdown: computeExpenseBreakdownFromTransactions(transactions, month),

    operational: computeOperationalMetrics(monthSheets, todaySheets),

    weeklyData: buildWeeklyChart(sheets, transactions),

    fleetStatus,

    monthData: buildMonthChartFromTransactions(transactions),

    recentRoadSheets,

    recentTransactions,

    notifications,

    maintenanceTrucks,

    topDrivers,

    trucks,

    drivers,

  };

}

