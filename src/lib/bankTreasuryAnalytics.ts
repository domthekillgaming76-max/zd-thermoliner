import type { Transaction } from './supabase';
import { isDebitTransaction } from './bankUtils';
import { buildMonthChartFromTransactions } from './transactionAnalytics';

export interface TreasuryChartPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
  balance: number;
}

export interface TreasuryMetrics {
  chartData: TreasuryChartPoint[];
  availableCash: number;
  forecastNextMonth: number;
  forecastTrend: 'up' | 'down' | 'flat';
  monthlyBalanceSeries: Array<{ month: string; balance: number }>;
}

export function buildTreasuryMetrics(
  transactions: Transaction[],
  accountBalance: number,
): TreasuryMetrics {
  const months = buildMonthChartFromTransactions(transactions);
  let runningBalance = accountBalance;

  const chartData: TreasuryChartPoint[] = [...months].reverse().map(m => {
    runningBalance -= m.profit;
    return {
      month: m.month,
      income: m.income,
      expenses: m.expenses,
      net: m.profit,
      balance: runningBalance,
    };
  }).reverse();

  const monthlyBalanceSeries = chartData.map(d => ({ month: d.month, balance: d.balance }));

  const recentProfits = chartData.slice(-3).map(d => d.net);
  const forecastNextMonth =
    recentProfits.length > 0
      ? recentProfits.reduce((s, v) => s + v, 0) / recentProfits.length
      : 0;

  const last = recentProfits[recentProfits.length - 1] ?? 0;
  const prev = recentProfits[recentProfits.length - 2] ?? last;
  const forecastTrend: TreasuryMetrics['forecastTrend'] =
    forecastNextMonth > prev + 50 ? 'up' : forecastNextMonth < prev - 50 ? 'down' : 'flat';

  const pendingDebits = transactions
    .filter(t => t.status === 'pending' && isDebitTransaction(t))
    .reduce((s, t) => s + Number(t.amount), 0);

  const availableCash = Math.max(0, accountBalance - pendingDebits);

  return {
    chartData: months.map(m => ({
      month: m.month,
      income: m.income,
      expenses: m.expenses,
      net: m.profit,
      balance: accountBalance,
    })),
    availableCash,
    forecastNextMonth: Math.round(forecastNextMonth * 100) / 100,
    forecastTrend,
    monthlyBalanceSeries,
  };
}

export interface AutoRoadSheetSyncSummary {
  revenue: number;
  fuel: number;
  tolls: number;
  repairs: number;
  insurance: number;
  salary: number;
  netProfit: number;
  sheetCount: number;
}

export function summarizeAutoRoadSheetLines(transactions: Transaction[]): AutoRoadSheetSyncSummary {
  const auto = transactions.filter(t => t.auto_generated);
  const byType = (type: string) =>
    auto.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

  const revenue = byType('income');
  const expenses =
    byType('fuel') + byType('toll') + byType('maintenance') + byType('insurance') + byType('salary') + byType('expense');

  return {
    revenue,
    fuel: byType('fuel'),
    tolls: byType('toll'),
    repairs: byType('maintenance'),
    insurance: byType('insurance'),
    salary: byType('salary'),
    netProfit: revenue - expenses,
    sheetCount: new Set(auto.map(t => t.road_sheet_id).filter(Boolean)).size,
  };
}
