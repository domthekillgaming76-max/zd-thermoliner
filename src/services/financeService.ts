import { supabase } from '../lib/supabase';
import { monthKey } from '../lib/format';
import { isCreditTransaction, isDebitTransaction } from '../lib/bankUtils';
import type {
  AccountingExportRow,
  DriverSalaryRow,
  FinanceBundle,
  FinanceDashboard,
  FinanceInvoiceRow,
  FinanceSettings,
} from '../lib/financeTypes';
import { resolveFinanceInvoiceStatus } from '../lib/financeTypes';
import { generatePayslipFromSalaryPayment } from './driverHrService';
import { adminTransferToDriver } from './driverBankService';

export async function fetchFinanceSettings(): Promise<FinanceSettings | null> {
  const { data, error } = await supabase.from('finance_settings').select('*').limit(1).maybeSingle();
  if (error) return null;
  return data as FinanceSettings | null;
}

export async function updateFinanceSettings(
  input: Partial<Pick<FinanceSettings, 'vat_rate' | 'delivery_bonus_eur' | 'default_salary_per_km' | 'auto_invoice_on_validation'>>,
  userId: string,
): Promise<FinanceSettings> {
  const existing = await fetchFinanceSettings();
  const payload = {
    ...input,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    const { data, error } = await supabase.from('finance_settings').update(payload).eq('id', existing.id).select().single();
    if (error) throw error;
    return data as FinanceSettings;
  }
  const { data, error } = await supabase.from('finance_settings').insert(payload).select().single();
  if (error) throw error;
  return data as FinanceSettings;
}

function buildDashboard(
  transactions: { type: string; amount: number; date: string }[],
  invoices: FinanceInvoiceRow[],
  salaries: DriverSalaryRow[],
  balance: number,
): FinanceDashboard {
  const month = monthKey();
  const monthTx = transactions.filter(t => t.date?.startsWith(month));
  const monthlyRevenue = monthTx.filter(t => isCreditTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenses = monthTx.filter(t => isDebitTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = monthlyRevenue - monthlyExpenses;
  const marginPercent = monthlyRevenue > 0 ? Math.round((netProfit / monthlyRevenue) * 1000) / 10 : 0;

  const pendingInvoices = invoices.filter(i => ['draft', 'sent'].includes(i.payment_status)).length;
  const paidInvoices = invoices.filter(i => i.payment_status === 'paid').length;
  const overdueInvoices = invoices.filter(i =>
    resolveFinanceInvoiceStatus(i.payment_status, i.due_date) === 'overdue',
  ).length;

  const pendingSalaries = salaries.filter(s => s.payment_status === 'pending');
  return {
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    marginPercent,
    cashBalance: balance,
    pendingInvoices,
    paidInvoices,
    overdueInvoices,
    salariesToPay: pendingSalaries.length,
    salariesToPayAmount: Math.round(pendingSalaries.reduce((s, r) => s + r.net_amount, 0) * 100) / 100,
  };
}

function mapInvoice(row: Record<string, unknown>): FinanceInvoiceRow {
  const clients = row.clients as { name?: string } | { name?: string }[] | null;
  const clientName = Array.isArray(clients) ? clients[0]?.name : clients?.name;
  return {
    id: row.id as string,
    invoice_number: (row.invoice_number as string) ?? null,
    client_name: clientName ?? null,
    route_summary: (row.route_summary as string) ?? null,
    distance_km: Number(row.distance_km ?? 0),
    cargo_type: (row.cargo_type as string) ?? null,
    amount_ht: Number(row.amount_ht ?? 0),
    vat_rate: Number(row.vat_rate ?? 20),
    vat_amount: Number(row.vat_amount ?? 0),
    amount_ttc: Number(row.amount_ttc ?? 0),
    payment_status: row.payment_status as FinanceInvoiceRow['payment_status'],
    invoice_date: row.invoice_date as string,
    due_date: row.due_date as string,
    paid_at: (row.paid_at as string) ?? null,
    road_sheet_id: (row.road_sheet_id as string) ?? null,
  };
}

function mapSalary(row: Record<string, unknown>): DriverSalaryRow {
  const drivers = row.drivers as { name?: string } | { name?: string }[] | null;
  const driverName = Array.isArray(drivers) ? drivers[0]?.name : drivers?.name;
  return {
    id: row.id as string,
    driver_id: row.driver_id as string,
    driver_name: driverName ?? 'Chauffeur',
    period_month: Number(row.period_month),
    period_year: Number(row.period_year),
    base_salary: Number(row.base_salary ?? 0),
    bonus: Number(row.bonus ?? 0),
    penalty: Number(row.penalty ?? 0),
    delivery_bonus: Number(row.delivery_bonus ?? 0),
    km_rate: Number(row.km_rate ?? 0),
    km_total: Number(row.km_total ?? 0),
    net_amount: Number(row.net_amount ?? 0),
    payment_status: (row.payment_status as DriverSalaryRow['payment_status']) ?? 'pending',
    payment_date: (row.payment_date as string) ?? null,
    road_sheet_id: (row.road_sheet_id as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
  };
}

export async function fetchFinanceInvoices(): Promise<FinanceInvoiceRow[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(name)')
    .order('invoice_date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(r => mapInvoice(r as Record<string, unknown>));
}

export async function fetchDriverSalaries(driverId?: string): Promise<DriverSalaryRow[]> {
  let query = supabase
    .from('driver_salary_history')
    .select('*, drivers(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (driverId) query = query.eq('driver_id', driverId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(r => mapSalary(r as Record<string, unknown>));
}

export async function fetchFinanceBundle(): Promise<FinanceBundle> {
  const [accountRes, txRes, invoices, salaries, settings] = await Promise.all([
    supabase.from('company_bank_account').select('balance').limit(1).maybeSingle(),
    supabase.from('transactions').select('type, amount, date').eq('status', 'posted').limit(2000),
    fetchFinanceInvoices(),
    fetchDriverSalaries(),
    fetchFinanceSettings(),
  ]);

  const balance = Number(accountRes.data?.balance ?? 0);
  const transactions = txRes.data ?? [];
  const dashboard = buildDashboard(transactions, invoices, salaries, balance);

  return {
    dashboard,
    settings,
    recentInvoices: invoices.slice(0, 8),
    pendingSalaries: salaries.filter(s => s.payment_status === 'pending').slice(0, 8),
  };
}

export async function payDriverSalary(
  salaryId: string,
  _userId: string,
): Promise<DriverSalaryRow> {
  const { data: salary, error } = await supabase
    .from('driver_salary_history')
    .select('*, drivers(name, user_id)')
    .eq('id', salaryId)
    .maybeSingle();
  if (error || !salary) throw new Error('Salaire introuvable.');
  if (salary.payment_status === 'paid') return mapSalary(salary as Record<string, unknown>);

  const amount = Number(salary.net_amount ?? 0);
  const driverName = (salary.drivers as { name?: string; user_id?: string } | null)?.name ?? 'Chauffeur';
  const driverUserId = (salary.drivers as { user_id?: string } | null)?.user_id;
  const month = Number(salary.period_month);
  const year = Number(salary.period_year);
  const reference = `SAL-${salaryId.slice(0, 8)}`;
  const reason = `Salaire RP — ${month}/${year} — ${driverName}`;

  if (!driverUserId) throw new Error('Chauffeur sans profil lié.');

  const transfer = await adminTransferToDriver({
    targetProfileId: driverUserId,
    type: 'salary',
    amount,
    reason,
    reference,
    salaryHistoryId: salaryId,
  });

  const { data: updated, error: updErr } = await supabase
    .from('driver_salary_history')
    .update({
      payment_status: 'paid',
      payment_date: new Date().toISOString().slice(0, 10),
      transaction_id: transfer.company_transaction_id,
    })
    .eq('id', salaryId)
    .select('*, drivers(name)')
    .single();

  if (updErr) throw updErr;

  const mapped = mapSalary(updated as Record<string, unknown>);

  try {
    await generatePayslipFromSalaryPayment(
      updated as Record<string, unknown>,
      transfer.company_transaction_id,
      transfer.reference,
      transfer.driver_transaction_id,
    );
  } catch { /* non-blocking */ }

  return mapped;
}

export async function fetchAccountingExport(): Promise<AccountingExportRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('date, type, category, description, amount, reference')
    .eq('status', 'posted')
    .order('date', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(r => ({
    date: r.date as string,
    type: r.type as string,
    category: (r.category as string) ?? '',
    description: (r.description as string) ?? '',
    amount: Number(r.amount ?? 0),
    reference: (r.reference as string) ?? null,
  }));
}

export function accountingToCsv(rows: AccountingExportRow[]): string {
  const header = 'Date;Type;Catégorie;Description;Montant;Référence';
  const lines = rows.map(r =>
    [r.date, r.type, r.category, r.description, r.amount, r.reference ?? ''].join(';'),
  );
  return [header, ...lines].join('\n');
}
