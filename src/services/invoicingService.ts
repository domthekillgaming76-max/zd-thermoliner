import { supabase } from '../lib/supabase';
import { insertTransactionRow } from '../lib/transactionInsert';
import {
  computeInvoiceAmounts,
  resolveInvoiceStatus,
  type ClientContact,
  type ClientFormInput,
  type ContractFormInput,
  type ErpClient,
  type Invoice,
  type InvoiceFormInput,
  type InvoiceLine,
  type PaymentReminder,
  type TransportContract,
} from '../lib/clientTypes';

function normalizeClient(row: Record<string, unknown>): ErpClient {
  return {
    id: row.id as string,
    name: row.name as string,
    contact_name: (row.contact_name as string) ?? null,
    contact_email: (row.contact_email as string) ?? null,
    contact_phone: (row.contact_phone as string) ?? null,
    email: (row.email as string) ?? (row.contact_email as string) ?? null,
    phone: (row.phone as string) ?? (row.contact_phone as string) ?? null,
    address: (row.address as string) ?? null,
    city: (row.city as string) ?? null,
    postal_code: (row.postal_code as string) ?? null,
    country: (row.country as string) ?? 'France',
    vat_number: (row.vat_number as string) ?? null,
    siret: (row.siret as string) ?? null,
    payment_terms: Number(row.payment_terms ?? 30),
    preferred_routes: (row.preferred_routes as string) ?? null,
    preferred_cargo: (row.preferred_cargo as string) ?? null,
    notes: (row.notes as string) ?? null,
    status: (row.status as ErpClient['status']) ?? 'active',
    total_revenue: Number(row.total_revenue ?? 0),
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? null,
  };
}

function clientFormToPayload(input: ClientFormInput): Record<string, unknown> {
  return {
    name: input.name,
    contact_name: input.contact_name || null,
    contact_email: input.contact_email || input.email || null,
    contact_phone: input.contact_phone || input.phone || null,
    email: input.email || input.contact_email || null,
    phone: input.phone || input.contact_phone || null,
    address: input.address || null,
    city: input.city || null,
    postal_code: input.postal_code || null,
    country: input.country || 'France',
    vat_number: input.vat_number || null,
    siret: input.siret || null,
    payment_terms: input.payment_terms ?? 30,
    preferred_routes: input.preferred_routes || null,
    preferred_cargo: input.preferred_cargo || null,
    notes: input.notes || null,
    status: input.status ?? 'active',
    updated_at: new Date().toISOString(),
  };
}

async function adjustCompanyBalance(delta: number): Promise<void> {
  const { data: account } = await supabase.from('company_bank_account').select('*').limit(1).maybeSingle();
  if (!account) {
    await supabase.from('company_bank_account').insert({
      account_name: 'Z&D Thermoliner',
      iban_rp: 'FR76 3000 2999 0000 0000 0000 000',
      balance: delta,
    });
    return;
  }
  await supabase.from('company_bank_account').update({
    balance: Number(account.balance) + delta,
    updated_at: new Date().toISOString(),
  }).eq('id', account.id);
}

export async function fetchErpClients(): Promise<ErpClient[]> {
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(r => normalizeClient(r as Record<string, unknown>));
}

export async function fetchErpClientById(id: string): Promise<ErpClient | null> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeClient(data as Record<string, unknown>) : null;
}

export async function createErpClient(input: ClientFormInput): Promise<ErpClient> {
  const { data, error } = await supabase.from('clients').insert(clientFormToPayload(input)).select().single();
  if (error) throw error;
  return normalizeClient(data as Record<string, unknown>);
}

export async function updateErpClient(id: string, input: ClientFormInput): Promise<ErpClient> {
  const { data, error } = await supabase.from('clients').update(clientFormToPayload(input)).eq('id', id).select().single();
  if (error) throw error;
  return normalizeClient(data as Record<string, unknown>);
}

export async function fetchClientContacts(clientId: string): Promise<ClientContact[]> {
  const { data, error } = await supabase.from('client_contacts').select('*').eq('client_id', clientId).order('is_primary', { ascending: false });
  if (error) return [];
  return (data ?? []) as ClientContact[];
}

export async function fetchContracts(): Promise<TransportContract[]> {
  const { data, error } = await supabase.from('transport_contracts').select('*').order('end_date', { ascending: true });
  if (error) return [];
  const clients = await fetchErpClients();
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  return (data ?? []).map(r => ({
    ...(r as TransportContract),
    client_name: clientMap.get((r as TransportContract).client_id) ?? null,
  }));
}

export async function createContract(input: ContractFormInput): Promise<TransportContract> {
  const { data, error } = await supabase.from('transport_contracts').insert({
    client_id: input.client_id,
    start_date: input.start_date,
    end_date: input.end_date,
    price_per_km: input.price_per_km ?? 0,
    minimum_monthly_volume: input.minimum_monthly_volume ?? 0,
    cargo_type: input.cargo_type || null,
    temperature_required: input.temperature_required ?? false,
    payment_delay: input.payment_delay ?? 30,
    status: input.status ?? 'active',
    notes: input.notes || null,
  }).select().single();
  if (error) throw error;
  return data as TransportContract;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase.from('invoices').select('*').order('invoice_date', { ascending: false });
  if (error) return [];
  const clients = await fetchErpClients();
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  return (data ?? []).map(r => {
    const inv = r as Invoice;
    return { ...inv, payment_status: resolveInvoiceStatus(inv), client_name: clientMap.get(inv.client_id) ?? null };
  });
}

export async function fetchInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const { data, error } = await supabase.from('invoice_lines').select('*').eq('invoice_id', invoiceId).order('sort_order');
  if (error) return [];
  return (data ?? []) as InvoiceLine[];
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const inv = data as Invoice;
  const lines = await fetchInvoiceLines(id);
  const client = await fetchErpClientById(inv.client_id);
  return { ...inv, payment_status: resolveInvoiceStatus(inv), client_name: client?.name ?? null, lines };
}

export async function createInvoice(input: InvoiceFormInput, createdBy?: string): Promise<Invoice> {
  const vatRate = input.vat_rate ?? 20;
  const { amountHt, vatAmount, amountTtc } = computeInvoiceAmounts(input.lines, vatRate);

  const { data, error } = await supabase.from('invoices').insert({
    client_id: input.client_id,
    road_sheet_id: input.road_sheet_id || null,
    mission_id: input.mission_id || null,
    contract_id: input.contract_id || null,
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    amount_ht: amountHt,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    amount_ttc: amountTtc,
    payment_status: 'draft',
    notes: input.notes || null,
    created_by: createdBy ?? null,
  }).select().single();
  if (error) throw error;

  const invoice = data as Invoice;
  const lineRows = input.lines.map((l, i) => ({
    invoice_id: invoice.id,
    description: l.description,
    quantity: l.quantity,
    unit_price: l.unit_price,
    amount_ht: Math.round(l.quantity * l.unit_price * 100) / 100,
    sort_order: i,
  }));
  await supabase.from('invoice_lines').insert(lineRows);

  const lines = await fetchInvoiceLines(invoice.id);
  const client = await fetchErpClientById(invoice.client_id);
  return { ...invoice, client_name: client?.name ?? null, lines };
}

export async function createInvoiceFromRoadSheet(roadSheetId: string, createdBy?: string): Promise<Invoice> {
  const { data: sheet } = await supabase.from('road_sheets').select('*').eq('id', roadSheetId).maybeSingle();
  if (!sheet) throw new Error('Feuille de route introuvable.');

  const clientId = await findOrCreateClientFromName(sheet.company as string | null);
  const amount = Number(sheet.revenue || 0);
  const paymentTerms = 30;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + paymentTerms);

  return createInvoice({
    client_id: clientId,
    road_sheet_id: roadSheetId,
    invoice_date: invoiceDate,
    due_date: due.toISOString().slice(0, 10),
    lines: [{
      description: `Transport ${sheet.departure ?? sheet.departure_city ?? '?'} → ${sheet.arrival ?? sheet.arrival_city ?? '?'} (${sheet.km ?? sheet.total_distance ?? 0} km)`,
      quantity: 1,
      unit_price: amount,
    }],
  }, createdBy);
}

export async function createInvoiceFromMission(missionId: string, createdBy?: string): Promise<Invoice> {
  const { data: mission } = await supabase.from('transport_missions').select('*').eq('id', missionId).maybeSingle();
  if (!mission) throw new Error('Mission introuvable.');

  const clientId = mission.client_id ?? await findOrCreateClientFromName(mission.client_name as string | null);
  const paymentTerms = 30;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + paymentTerms);

  return createInvoice({
    client_id: clientId,
    mission_id: missionId,
    invoice_date: invoiceDate,
    due_date: due.toISOString().slice(0, 10),
    lines: [{
      description: `Mission ${mission.reference ?? ''} — ${mission.departure_city} → ${mission.arrival_city}`,
      quantity: 1,
      unit_price: Number(mission.price || 0),
    }],
  }, createdBy);
}

async function findOrCreateClientFromName(name: string | null): Promise<string> {
  if (!name) {
    const { data } = await supabase.from('clients').select('id').limit(1).maybeSingle();
    if (data?.id) return data.id as string;
    const created = await createErpClient({ name: 'Client divers' });
    return created.id;
  }
  const { data: existing } = await supabase.from('clients').select('id').ilike('name', name).maybeSingle();
  if (existing?.id) return existing.id as string;
  const created = await createErpClient({ name });
  return created.id;
}

export async function updateInvoiceStatus(id: string, status: Invoice['payment_status']): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').update({
    payment_status: status,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function markInvoicePaid(invoiceId: string, userId: string): Promise<Invoice> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');
  if (invoice.payment_status === 'paid') return invoice;

  const reference = `INV-${invoice.invoice_number ?? invoice.id.slice(0, 8)}`;
  await insertTransactionRow({
    user_id: userId,
    type: 'income',
    amount: Number(invoice.amount_ttc),
    description: `Facture ${invoice.invoice_number} — ${invoice.client_name ?? 'Client'}`,
    category: 'Facturation',
    date: new Date().toISOString().slice(0, 10),
    auto_generated: true,
    created_by: userId,
    reference,
  });

  await adjustCompanyBalance(Number(invoice.amount_ttc));

  const { data: latestTx } = await supabase
    .from('transactions')
    .select('id')
    .eq('reference', reference)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase.from('invoices').update({
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
    transaction_id: latestTx?.id ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', invoiceId).select().single();
  if (error) throw error;

  const client = await fetchErpClientById(invoice.client_id);
  if (client) {
    await supabase.from('clients').update({
      total_revenue: Number(client.total_revenue) + Number(invoice.amount_ttc),
      updated_at: new Date().toISOString(),
    }).eq('id', client.id);
  }

  const lines = await fetchInvoiceLines(invoiceId);
  return { ...(data as Invoice), lines, client_name: client?.name ?? null };
}

export async function fetchBillableRoadSheets(): Promise<{ id: string; label: string; revenue: number }[]> {
  const { data: invoiced } = await supabase.from('invoices').select('road_sheet_id').not('road_sheet_id', 'is', null);
  const invoicedIds = new Set((invoiced ?? []).map(r => r.road_sheet_id as string));

  const { data } = await supabase
    .from('road_sheets')
    .select('id, departure, arrival, departure_city, arrival_city, revenue, validated, status')
    .or('validated.eq.true,status.eq.validated,status.eq.approved')
    .order('date', { ascending: false })
    .limit(50);

  return (data ?? [])
    .filter(s => !invoicedIds.has(s.id as string) && Number(s.revenue) > 0)
    .map(s => ({
      id: s.id as string,
      label: `${s.departure ?? s.departure_city} → ${s.arrival ?? s.arrival_city} (${fmtAmount(s.revenue)} €)`,
      revenue: Number(s.revenue),
    }));
}

export async function fetchBillableMissions(): Promise<{ id: string; label: string; price: number }[]> {
  const { data: invoiced } = await supabase.from('invoices').select('mission_id').not('mission_id', 'is', null);
  const invoicedIds = new Set((invoiced ?? []).map(r => r.mission_id as string));

  const { data } = await supabase
    .from('transport_missions')
    .select('id, reference, departure_city, arrival_city, price, status')
    .eq('status', 'delivered')
    .order('delivery_date', { ascending: false })
    .limit(50);

  return (data ?? [])
    .filter(m => !invoicedIds.has(m.id as string) && Number(m.price) > 0)
    .map(m => ({
      id: m.id as string,
      label: `${m.reference} — ${m.departure_city} → ${m.arrival_city} (${fmtAmount(m.price)} €)`,
      price: Number(m.price),
    }));
}

function fmtAmount(n: unknown): string {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export async function fetchClientMissionsForDriver(driverId: string): Promise<{ id: string; client_name: string | null; departure_city: string; arrival_city: string }[]> {
  const { data } = await supabase
    .from('transport_missions')
    .select('id, client_name, departure_city, arrival_city')
    .eq('driver_id', driverId)
    .not('status', 'eq', 'cancelled');
  return (data ?? []) as { id: string; client_name: string | null; departure_city: string; arrival_city: string }[];
}

export async function fetchInvoicingModuleBundle() {
  const [clients, contracts, invoices, billableSheets, billableMissions] = await Promise.all([
    fetchErpClients(),
    fetchContracts(),
    fetchInvoices(),
    fetchBillableRoadSheets(),
    fetchBillableMissions(),
  ]);

  return { clients, contracts, invoices, billableSheets, billableMissions };
}

export async function fetchClientDetailBundle(clientId: string) {
  const [client, contacts, contracts, invoices] = await Promise.all([
    fetchErpClientById(clientId),
    fetchClientContacts(clientId),
    fetchContracts().then(list => list.filter(c => c.client_id === clientId)),
    fetchInvoices().then(list => list.filter(i => i.client_id === clientId)),
  ]);
  if (!client) throw new Error('Client introuvable.');
  return { client, contacts, contracts, invoices };
}

export type { ClientFormInput, ContractFormInput, InvoiceFormInput } from '../lib/clientTypes';

export async function fetchPaymentReminders(): Promise<PaymentReminder[]> {
  const { data, error } = await supabase.from('payment_reminders').select('*').order('reminder_date', { ascending: true });
  if (error) return [];
  return (data ?? []) as PaymentReminder[];
}
