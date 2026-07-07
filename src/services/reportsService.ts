import { supabase } from '../lib/supabase';
import { monthKey } from '../lib/format';
import { isCreditTransaction, isDebitTransaction } from '../lib/bankUtils';
import { resolveInvoiceStatus, type Invoice } from '../lib/clientTypes';
import type {
  DriverReportRow,
  FleetReportRow,
  InvoiceReportRow,
  MonthlyFinancePoint,
  ReportsBundle,
  ReportsDashboard,
  RoadSheetReportRow,
  ReportExportType,
} from '../lib/reportsTypes';

function isReportsSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

function buildMonthlyFinance(transactions: { type: string; amount: number; date: string }[]): MonthlyFinancePoint[] {
  const months: MonthlyFinancePoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const mTx = transactions.filter(t => t.date?.startsWith(key));
    const income = mTx.filter(t => isCreditTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = mTx.filter(t => isDebitTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    months.push({ month: key, label, income, expenses, profit: income - expenses });
  }
  return months;
}

export async function fetchReportsBundle(): Promise<ReportsBundle> {
  const { error: probe } = await supabase.from('report_exports').select('id').limit(1);
  const migrationRequired = !!probe && isReportsSchemaError(probe);

  const [
    accountRes,
    txRes,
    driversRes,
    trucksRes,
    costsRes,
    roadRes,
    invoiceRes,
    missionsRes,
  ] = await Promise.all([
    supabase.from('company_bank_account').select('balance').limit(1).maybeSingle(),
    supabase.from('transactions').select('type, amount, date, status').eq('status', 'posted').limit(1000),
    supabase.from('drivers').select('id, name, status').limit(200),
    supabase.from('trucks').select('id, brand, model, registration, status, mileage').limit(200),
    supabase.from('truck_costs').select('truck_id, total_cost, total_revenue').limit(200),
    supabase.from('road_sheets').select('id, driver_id, driver_name, departure, arrival, date, status, revenue, net_profit, total_expenses').order('date', { ascending: false }).limit(200),
    supabase.from('invoices').select('id, invoice_number, client_id, due_date, amount_ttc, payment_status, clients(name)').limit(200),
    supabase.from('transport_missions').select('id, driver_id, status').limit(300),
  ]);

  const transactions = txRes.data ?? [];
  const monthlyFinance = buildMonthlyFinance(transactions);
  const month = monthKey(new Date());
  const monthTx = transactions.filter(t => t.date?.startsWith(month));
  const monthlyIncome = monthTx.filter(t => isCreditTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenses = monthTx.filter(t => isDebitTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);

  const drivers = driversRes.data ?? [];
  const roadSheets = roadRes.data ?? [];
  const missions = missionsRes.data ?? [];
  const costs = costsRes.data ?? [];
  const trucks = trucksRes.data ?? [];
  const invoices = (invoiceRes.data ?? []) as unknown as (Invoice & { clients?: { name: string } | null })[];

  const driverRows: DriverReportRow[] = drivers.map(d => {
    const relevant = roadSheets.filter(r => r.driver_id === d.id);
    const revenue = relevant.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const expenses = relevant.reduce((s, r) => s + Number(r.total_expenses ?? 0), 0);
    const profit = relevant.reduce((s, r) => s + Number(r.net_profit ?? 0), 0);
    return {
      id: d.id,
      name: d.name as string,
      roadSheets: relevant.length,
      revenue: Math.round(revenue * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      missions: missions.filter(m => m.driver_id === d.id).length,
    };
  }).sort((a, b) => b.profit - a.profit);

  const fleetRows: FleetReportRow[] = trucks.map(t => {
    const cost = costs.find(c => c.truck_id === t.id);
    const totalCost = Number(cost?.total_cost ?? 0);
    const revenue = Number(cost?.total_revenue ?? 0);
    return {
      id: t.id,
      label: [t.brand, t.model, t.registration].filter(Boolean).join(' '),
      status: t.status as string,
      mileage: Number(t.mileage ?? 0),
      totalCost,
      revenue,
      profit: revenue - totalCost,
    };
  }).sort((a, b) => b.profit - a.profit);

  const roadRows: RoadSheetReportRow[] = roadSheets.map(r => ({
    id: r.id,
    driverName: (r.driver_name as string) ?? '—',
    route: [r.departure, r.arrival].filter(Boolean).join(' → ') || '—',
    date: (r.date as string) ?? '',
    status: (r.status as string) ?? 'draft',
    revenue: Number(r.revenue ?? 0),
    netProfit: Number(r.net_profit ?? 0),
  }));

  const invoiceRows: InvoiceReportRow[] = invoices.map(inv => ({
    id: inv.id,
    number: inv.invoice_number ?? '—',
    clientName: inv.clients?.name ?? inv.client_name ?? '—',
    dueDate: inv.due_date,
    amountTtc: Number(inv.amount_ttc ?? 0),
    status: resolveInvoiceStatus(inv),
  }));

  const pendingRoadSheets = roadSheets.filter(r => ['submitted', 'draft'].includes(r.status as string)).length;
  const validatedRoadSheets = roadSheets.filter(r => ['validated', 'approved'].includes(r.status as string)).length;
  const lateInvoices = invoiceRows.filter(i => i.status === 'late').length;
  const fleetProfitability = fleetRows.reduce((s, f) => s + f.profit, 0);

  const dashboard: ReportsDashboard = {
    companyBalance: Number(accountRes.data?.balance ?? 0),
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
    monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    monthlyProfit: Math.round((monthlyIncome - monthlyExpenses) * 100) / 100,
    totalDrivers: drivers.filter(d => d.status === 'active').length,
    activeTrucks: trucks.filter(t => t.status === 'active').length,
    pendingRoadSheets,
    lateInvoices,
    validatedRoadSheets,
    fleetProfitability: Math.round(fleetProfitability * 100) / 100,
  };

  return {
    dashboard,
    monthlyFinance,
    drivers: driverRows,
    fleet: fleetRows,
    roadSheets: roadRows,
    invoices: invoiceRows,
    migrationRequired,
  };
}

export async function logReportExport(
  userId: string,
  reportType: ReportExportType,
  rowCount: number,
  format: 'csv' | 'json' = 'csv',
): Promise<void> {
  const { error } = await supabase.from('report_exports').insert({
    user_id: userId,
    report_type: reportType,
    format,
    row_count: rowCount,
  });
  if (error && !isReportsSchemaError(error)) throw error;
}

export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
