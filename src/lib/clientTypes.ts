export type ClientStatus = 'active' | 'inactive' | 'prospect' | 'suspended';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'late' | 'cancelled';

export interface ErpClient {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  vat_number: string | null;
  siret: string | null;
  payment_terms: number;
  preferred_routes: string | null;
  preferred_cargo: string | null;
  notes: string | null;
  status: ClientStatus;
  total_revenue: number;
  created_at: string;
  updated_at: string | null;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface TransportContract {
  id: string;
  client_id: string;
  contract_number: string | null;
  start_date: string;
  end_date: string;
  price_per_km: number;
  minimum_monthly_volume: number;
  cargo_type: string | null;
  temperature_required: boolean;
  payment_delay: number;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  client_name?: string | null;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount_ht: number;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string | null;
  road_sheet_id: string | null;
  mission_id: string | null;
  contract_id: string | null;
  invoice_date: string;
  due_date: string;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  payment_status: InvoiceStatus;
  paid_at: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  client_name?: string | null;
  lines?: InvoiceLine[];
}

export interface PaymentReminder {
  id: string;
  invoice_id: string;
  client_id: string | null;
  reminder_date: string;
  sent: boolean;
  notes: string | null;
  created_at: string;
}

export interface ClientsDashboardStats {
  totalClients: number;
  activeClients: number;
  monthlyRevenue: number;
  unpaidInvoices: number;
  latePayments: number;
  contractsEndingSoon: number;
  bestClientName: string | null;
  bestClientRevenue: number;
}

export interface ClientFormInput {
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  siret?: string;
  payment_terms?: number;
  preferred_routes?: string;
  preferred_cargo?: string;
  notes?: string;
  status?: ClientStatus;
}

export interface ContractFormInput {
  client_id: string;
  start_date: string;
  end_date: string;
  price_per_km?: number;
  minimum_monthly_volume?: number;
  cargo_type?: string;
  temperature_required?: boolean;
  payment_delay?: number;
  status?: ContractStatus;
  notes?: string;
}

export interface InvoiceFormInput {
  client_id: string;
  road_sheet_id?: string;
  mission_id?: string;
  contract_id?: string;
  invoice_date: string;
  due_date: string;
  vat_rate?: number;
  notes?: string;
  lines: { description: string; quantity: number; unit_price: number }[];
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: 'Actif', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  inactive: { label: 'Inactif', color: 'text-white/40 bg-white/5 border-white/10' },
  prospect: { label: 'Prospect', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  suspended: { label: 'Suspendu', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'text-white/50 bg-white/10 border-white/15' },
  sent: { label: 'Envoyée', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
  paid: { label: 'Payée', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  late: { label: 'En retard', color: 'text-red-400 bg-red-500/10 border-red-500/25' },
  cancelled: { label: 'Annulée', color: 'text-white/30 bg-white/5 border-white/10' },
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  expired: 'Expiré',
  cancelled: 'Annulé',
};

export function computeInvoiceAmounts(lines: { quantity: number; unit_price: number }[], vatRate = 20) {
  const amountHt = Math.round(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 100) / 100;
  const vatAmount = Math.round(amountHt * (vatRate / 100) * 100) / 100;
  const amountTtc = Math.round((amountHt + vatAmount) * 100) / 100;
  return { amountHt, vatAmount, amountTtc };
}

export function resolveInvoiceStatus(invoice: Invoice): InvoiceStatus {
  if (invoice.payment_status === 'paid' || invoice.payment_status === 'cancelled') return invoice.payment_status;
  const today = new Date().toISOString().slice(0, 10);
  if (invoice.due_date < today && ['sent', 'draft'].includes(invoice.payment_status)) return 'late';
  return invoice.payment_status;
}

export function computeClientsDashboard(
  clients: ErpClient[],
  invoices: Invoice[],
  contracts: TransportContract[],
): ClientsDashboardStats {
  const month = new Date().toISOString().slice(0, 7);
  const active = clients.filter(c => c.status === 'active');
  const monthPaid = invoices.filter(i => i.payment_status === 'paid' && i.paid_at?.startsWith(month));
  const monthlyRevenue = monthPaid.reduce((s, i) => s + Number(i.amount_ttc), 0);
  const unpaid = invoices.filter(i => ['sent', 'late', 'draft'].includes(resolveInvoiceStatus(i))).length;
  const late = invoices.filter(i => resolveInvoiceStatus(i) === 'late').length;

  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const contractsEndingSoon = contracts.filter(c => {
    if (c.status !== 'active') return false;
    return new Date(c.end_date) <= in30;
  }).length;

  const revenueByClient = new Map<string, number>();
  for (const i of invoices.filter(inv => inv.payment_status === 'paid')) {
    revenueByClient.set(i.client_id, (revenueByClient.get(i.client_id) ?? 0) + Number(i.amount_ttc));
  }
  let bestClientName: string | null = null;
  let bestClientRevenue = 0;
  for (const c of clients) {
    const rev = revenueByClient.get(c.id) ?? Number(c.total_revenue);
    if (rev > bestClientRevenue) {
      bestClientRevenue = rev;
      bestClientName = c.name;
    }
  }

  return {
    totalClients: clients.length,
    activeClients: active.length,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    unpaidInvoices: unpaid,
    latePayments: late,
    contractsEndingSoon,
    bestClientName,
    bestClientRevenue: Math.round(bestClientRevenue * 100) / 100,
  };
}
