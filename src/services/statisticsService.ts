import { supabase } from '../lib/supabase';
import { monthKey } from '../lib/format';
import { isCreditTransaction, isDebitTransaction } from '../lib/bankUtils';
import { fetchAllTransactions } from '../lib/transactionSchema';
import { DEFAULT_COEFFICIENTS } from '../lib/roadSheetCalculations';
import type {
  DriverRevenueRow,
  FuelEstimate,
  MarginEvolutionPoint,
  MonthlyKmPoint,
  RouteProfitRow,
  StatisticsBundle,
} from '../lib/statisticsTypes';

function buildMonthlyKm(sheets: { date?: string; km?: number; total_distance?: number }[]): MonthlyKmPoint[] {
  const points: MonthlyKmPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const km = sheets
      .filter(s => s.date?.startsWith(key))
      .reduce((sum, s) => sum + Number(s.km ?? s.total_distance ?? 0), 0);
    points.push({ month: label, km: Math.round(km) });
  }
  return points;
}

function buildRevenueByDriver(
  sheets: { date?: string; driver_id?: string; driver_name?: string; revenue?: number; km?: number; total_distance?: number; validated?: boolean }[],
  month: string,
): DriverRevenueRow[] {
  const map = new Map<string, DriverRevenueRow>();
  for (const s of sheets.filter(s => s.validated && s.date?.startsWith(month))) {
    const id = (s.driver_id as string) ?? 'unknown';
    const existing = map.get(id) ?? {
      driverId: id,
      driverName: (s.driver_name as string) ?? 'Chauffeur',
      revenue: 0,
      deliveries: 0,
      km: 0,
    };
    existing.revenue += Number(s.revenue ?? 0);
    existing.deliveries += 1;
    existing.km += Number(s.km ?? s.total_distance ?? 0);
    map.set(id, existing);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function buildProfitByRoute(
  sheets: { departure?: string; departure_city?: string; arrival?: string; arrival_city?: string; revenue?: number; profit?: number; net_profit?: number; validated?: boolean }[],
): RouteProfitRow[] {
  const map = new Map<string, RouteProfitRow>();
  for (const s of sheets.filter(s => s.validated)) {
    const dep = (s.departure ?? s.departure_city ?? '?') as string;
    const arr = (s.arrival ?? s.arrival_city ?? '?') as string;
    const route = `${dep} → ${arr}`;
    const revenue = Number(s.revenue ?? 0);
    const profit = Number(s.profit ?? s.net_profit ?? revenue * 0.15);
    const existing = map.get(route) ?? { route, revenue: 0, profit: 0, deliveries: 0, marginPercent: 0 };
    existing.revenue += revenue;
    existing.profit += profit;
    existing.deliveries += 1;
    existing.marginPercent = existing.revenue > 0
      ? Math.round((existing.profit / existing.revenue) * 1000) / 10
      : 0;
    map.set(route, existing);
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit);
}

function buildMarginEvolution(transactions: Awaited<ReturnType<typeof fetchAllTransactions>>): MarginEvolutionPoint[] {
  const posted = transactions.filter(t => !t.status || t.status === 'posted');
  const points: MarginEvolutionPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    const mTx = posted.filter(t => t.date?.startsWith(key));
    const revenue = mTx.filter(t => isCreditTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = mTx.filter(t => isDebitTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const profit = revenue - expenses;
    points.push({
      month: label,
      marginPercent: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
    });
  }
  return points;
}

function computeFuelEstimate(kmMonth: number, fuelTxMonth: number): FuelEstimate {
  const consumption = DEFAULT_COEFFICIENTS.fuelConsumptionL100;
  const liters = (kmMonth * consumption) / 100;
  const cost = fuelTxMonth > 0 ? fuelTxMonth : liters * DEFAULT_COEFFICIENTS.fuelPricePerLiter;
  return {
    monthLiters: Math.round(liters),
    monthCost: Math.round(cost * 100) / 100,
    avgConsumptionL100: consumption,
    kmMonth: Math.round(kmMonth),
  };
}

export async function fetchStatisticsBundle(): Promise<StatisticsBundle> {
  const month = monthKey();
  const [transactions, sheetsRes] = await Promise.all([
    fetchAllTransactions({ orderBy: 'date', ascending: false }),
    supabase.from('road_sheets').select('*'),
  ]);

  const sheets = (sheetsRes.data ?? []) as Record<string, unknown>[];
  const monthSheets = sheets.filter(s => (s.date as string)?.startsWith(month) && s.validated);
  const kmMonth = monthSheets.reduce((s, r) => s + Number(r.km ?? r.total_distance ?? 0), 0);
  const fuelTxMonth = transactions
    .filter(t => t.date?.startsWith(month) && t.type === 'fuel')
    .reduce((s, t) => s + Number(t.amount), 0);

  const revenueByDriver = buildRevenueByDriver(sheets as never[], month);
  const profitByRoute = buildProfitByRoute(sheets as never[]);

  return {
    monthlyKm: buildMonthlyKm(sheets as never[]),
    revenueByDriver,
    profitByRoute,
    fuelEstimate: computeFuelEstimate(kmMonth, fuelTxMonth),
    bestDrivers: revenueByDriver.slice(0, 8),
    bestRoutes: profitByRoute.slice(0, 8),
    marginEvolution: buildMarginEvolution(transactions),
  };
}
