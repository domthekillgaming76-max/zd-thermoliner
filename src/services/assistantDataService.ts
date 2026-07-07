import { supabase } from '../lib/supabase';
import { monthKey } from '../lib/format';
import { isCreditTransaction, isDebitTransaction } from '../lib/bankUtils';
import { resolveInvoiceStatus, type Invoice } from '../lib/clientTypes';
import { getMaintenanceAlerts } from '../lib/fleetTypes';
import type { FleetTruck, FleetMaintenance, TruckCosts } from '../lib/fleetTypes';
import type { AssistantDataSnapshot } from '../lib/assistantTypes';
import { canAskGlobalQuestions } from '../lib/assistantPermissions';

function isSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

export async function fetchAssistantSnapshot(
  userId: string,
  role: string | null | undefined,
  email?: string | null,
): Promise<{ snapshot: AssistantDataSnapshot; migrationRequired: boolean }> {
  const { error: probe } = await supabase.from('ai_conversations').select('id').limit(1);
  const migrationRequired = !!probe && isSchemaError(probe);

  const global = canAskGlobalQuestions(role, email);
  const month = monthKey(new Date());

  const empty: AssistantDataSnapshot = {
    monthlyEarnings: 0,
    monthlyExpenses: 0,
    companyBalance: 0,
    topDriver: null,
    costliestTruck: null,
    pendingRoadSheets: 0,
    lateInvoices: 0,
    urgentMaintenance: 0,
    pendingMissions: 0,
  };

  if (!global) {
    const driverSnap = await fetchDriverSnapshot(userId);
    return { snapshot: { ...empty, ...driverSnap }, migrationRequired };
  }

  const [
    accountRes,
    txRes,
    roadRes,
    invoiceRes,
    trucksRes,
    costsRes,
    maintRes,
    missionsRes,
    driversRes,
  ] = await Promise.all([
    supabase.from('company_bank_account').select('balance').limit(1).maybeSingle(),
    supabase.from('transactions').select('type, amount, date, status').eq('status', 'posted').limit(500),
    supabase.from('road_sheets').select('id, status, driver_id, revenue, total_expenses, net_profit').limit(200),
    supabase.from('invoices').select('*').limit(200),
    supabase.from('trucks').select('id, brand, model, registration, status, insurance_date, technical_inspection_date, mileage, driver_id').limit(100),
    supabase.from('truck_costs').select('*').limit(100),
    supabase.from('fleet_maintenance').select('*').limit(100),
    supabase.from('transport_missions').select('id, status').in('status', ['pending', 'assigned', 'in_transit']).limit(100),
    supabase.from('drivers').select('id, name, user_id, salary_base').limit(100),
  ]);

  const transactions = txRes.data ?? [];
  const monthTx = transactions.filter(t => (t.date as string)?.startsWith(month));
  const monthlyEarnings = monthTx
    .filter(t => isCreditTransaction(t.type as string))
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenses = monthTx
    .filter(t => isDebitTransaction(t.type as string))
    .reduce((s, t) => s + Number(t.amount), 0);

  const roadSheets = roadRes.data ?? [];
  const pendingRoadSheets = roadSheets.filter(r =>
    ['submitted', 'draft'].includes(r.status as string),
  ).length;

  const invoices = (invoiceRes.data ?? []) as Invoice[];
  const lateInvoices = invoices.filter(i => resolveInvoiceStatus(i) === 'late').length;

  const trucks = (trucksRes.data ?? []) as FleetTruck[];
  const costs = (costsRes.data ?? []) as TruckCosts[];
  const maintenance = (maintRes.data ?? []) as FleetMaintenance[];
  const alerts = getMaintenanceAlerts(trucks, maintenance);
  const urgentMaintenance = alerts.filter(a => a.urgency === 'high').length;

  let costliestTruck: AssistantDataSnapshot['costliestTruck'] = null;
  if (costs.length > 0) {
    const top = [...costs].sort((a, b) => Number(b.total_cost) - Number(a.total_cost))[0];
    const truck = trucks.find(t => t.id === top.truck_id);
    costliestTruck = {
      label: truck
        ? [truck.brand, truck.model, truck.registration].filter(Boolean).join(' ')
        : 'Camion',
      cost: Number(top.total_cost),
    };
  }

  const drivers = driversRes.data ?? [];
  const driverProfits = drivers.map(d => {
    const sheets = roadSheets.filter(r => r.driver_id === d.id);
    const revenue = sheets.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const cost = sheets.reduce((s, r) => s + Number(r.total_expenses ?? 0), 0);
    const profit = sheets.reduce((s, r) => s + Number(r.net_profit ?? (Number(r.revenue ?? 0) - Number(r.total_expenses ?? 0))), 0);
    return { name: d.name as string, profit: profit || revenue - cost };
  });
  const topDriver = driverProfits.length
    ? driverProfits.sort((a, b) => b.profit - a.profit)[0]
    : null;

  return {
    snapshot: {
      monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
      companyBalance: Number(accountRes.data?.balance ?? 0),
      topDriver: topDriver && topDriver.profit > 0 ? topDriver : topDriver,
      costliestTruck,
      pendingRoadSheets,
      lateInvoices,
      urgentMaintenance,
      pendingMissions: missionsRes.data?.length ?? 0,
    },
    migrationRequired,
  };
}

async function fetchDriverSnapshot(userId: string): Promise<Partial<AssistantDataSnapshot>> {
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, name, salary_base')
    .eq('user_id', userId)
    .maybeSingle();

  if (!driver) {
    return { driverRoadSheets: 0, driverMissions: 0, driverSalary: 0 };
  }

  const [sheetsRes, missionsRes] = await Promise.all([
    supabase.from('road_sheets').select('id, status').eq('driver_id', driver.id).limit(50),
    supabase.from('transport_missions').select('id, status')
      .eq('driver_id', driver.id)
      .in('status', ['pending', 'assigned', 'in_transit'])
      .limit(20),
  ]);

  const pendingSheets = (sheetsRes.data ?? []).filter(s =>
    ['submitted', 'draft', 'approved'].includes(s.status as string),
  ).length;

  return {
    driverRoadSheets: pendingSheets,
    driverMissions: missionsRes.data?.length ?? 0,
    driverSalary: Number(driver.salary_base ?? 0),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}
