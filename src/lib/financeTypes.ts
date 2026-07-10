export type FinanceInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'late' | 'cancelled';
export type SalaryPaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface FinanceSettings {
  id: string;
  vat_rate: number;
  delivery_bonus_eur: number;
  default_salary_per_km: number;
  invoice_prefix: string;
  auto_invoice_on_validation: boolean;
  validation_automatique_livraisons: boolean;
  updated_at: string;
}

export interface FinanceDashboard {
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  marginPercent: number;
  cashBalance: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  salariesToPay: number;
  salariesToPayAmount: number;
}

export interface FinanceInvoiceRow {
  id: string;
  invoice_number: string | null;
  client_name: string | null;
  route_summary: string | null;
  distance_km: number;
  cargo_type: string | null;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  payment_status: FinanceInvoiceStatus;
  invoice_date: string;
  due_date: string;
  paid_at: string | null;
  road_sheet_id: string | null;
}

export interface DriverSalaryRow {
  id: string;
  driver_id: string;
  driver_name: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  bonus: number;
  penalty: number;
  delivery_bonus: number;
  km_rate: number;
  km_total: number;
  net_amount: number;
  payment_status: SalaryPaymentStatus;
  payment_date: string | null;
  road_sheet_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AccountingExportRow {
  date: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  reference: string | null;
}

export interface FinanceBundle {
  dashboard: FinanceDashboard;
  settings: FinanceSettings | null;
  recentInvoices: FinanceInvoiceRow[];
  pendingSalaries: DriverSalaryRow[];
}

export const FINANCE_INVOICE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'text-white/50 bg-white/10 border-white/15' },
  sent: { label: 'Envoyée', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
  paid: { label: 'Payée', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  overdue: { label: 'En retard', color: 'text-red-400 bg-red-500/10 border-red-500/25' },
  late: { label: 'En retard', color: 'text-red-400 bg-red-500/10 border-red-500/25' },
  cancelled: { label: 'Annulée', color: 'text-white/30 bg-white/5 border-white/10' },
};

export const SALARY_STATUS_LABELS: Record<SalaryPaymentStatus, { label: string; color: string }> = {
  pending: { label: 'À payer', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  paid: { label: 'Payée', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  cancelled: { label: 'Annulée', color: 'text-white/30 bg-white/5 border-white/10' },
};

export function formatFinanceEuro(n: number): string {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
}

export function resolveFinanceInvoiceStatus(
  status: string,
  dueDate: string,
): FinanceInvoiceStatus {
  if (status === 'paid' || status === 'cancelled') return status as FinanceInvoiceStatus;
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate < today && ['sent', 'draft'].includes(status)) return 'overdue';
  return status as FinanceInvoiceStatus;
}
