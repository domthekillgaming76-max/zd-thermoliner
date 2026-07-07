import type { RoadSheet, Transaction } from '../lib/supabase';

import { isCreditTransaction } from '../lib/bankUtils';

import { buildWeeklyRevenueFromTransactions } from '../lib/transactionAnalytics';

import type {

  DashboardTrends,

  OperationalMetrics,

  WeeklyDataPoint,

} from '../types/dashboard';



function pctChange(current: number, previous: number): number {

  if (previous === 0) return current > 0 ? 100 : 0;

  return ((current - previous) / previous) * 100;

}



function prevMonthKey(): string {

  const d = new Date();

  d.setMonth(d.getMonth() - 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

}



function prevDayKey(): string {

  const d = new Date();

  d.setDate(d.getDate() - 1);

  return d.toISOString().split('T')[0];

}



export function computeTrends(

  transactions: Transaction[],

  _month: string,

  _today: string,

  revenueToday: number,

  revenueMonth: number,

  expensesMonth: number,

  fleetTotal: number,

  fleetActive: number,

  sheets: RoadSheet[],

): DashboardTrends {

  const yesterday = prevDayKey();

  const prevMonth = prevMonthKey();



  const revenueYesterday = transactions

    .filter(t => isCreditTransaction(t) && t.date?.startsWith(yesterday))

    .reduce((s, t) => s + Number(t.amount), 0);



  const revenuePrevMonth = transactions

    .filter(t => isCreditTransaction(t) && t.date?.startsWith(prevMonth))

    .reduce((s, t) => s + Number(t.amount), 0);



  const validated = sheets.filter(s => s.validated).length;

  const total = sheets.length;



  return {

    revenueTodayChange: pctChange(revenueToday, revenueYesterday),

    revenueMonthChange: pctChange(revenueMonth, revenuePrevMonth),

    profitMargin: revenueMonth > 0 ? ((revenueMonth - expensesMonth) / revenueMonth) * 100 : 0,

    fleetUtilization: fleetTotal > 0 ? (fleetActive / fleetTotal) * 100 : 0,

    validationRate: total > 0 ? (validated / total) * 100 : 0,

    expenseRatio: revenueMonth > 0 ? (expensesMonth / revenueMonth) * 100 : 0,

  };

}



export function computeOperationalMetrics(

  monthSheets: RoadSheet[],

  todaySheets: RoadSheet[],

): OperationalMetrics {

  const validated = monthSheets.filter(s => s.validated);

  const totalRevenue = validated.reduce((s, r) => s + Number(r.revenue || 0), 0);

  const totalKm = monthSheets.reduce((s, r) => s + Number(r.km || 0), 0);



  return {

    avgRevenuePerDelivery: validated.length > 0 ? totalRevenue / validated.length : 0,

    totalKmMonth: totalKm,

    activeAssignments: monthSheets.filter(s => !s.validated).length,

    pendingValidations: monthSheets.filter(s => !s.validated).length,

    completedToday: todaySheets.filter(s => s.validated).length,

  };

}



export function buildWeeklyChart(sheets: RoadSheet[], transactions: Transaction[]): WeeklyDataPoint[] {

  const revenueByDay = buildWeeklyRevenueFromTransactions(transactions);

  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];



  return revenueByDay.map(({ day, revenue }) => {

    const d = new Date(day);

    const validatedDaySheets = sheets.filter(s => s.validated && s.date?.startsWith(day));

    return {

      day,

      label: dayLabels[d.getDay()],

      deliveries: validatedDaySheets.length,

      revenue,

    };

  });

}

