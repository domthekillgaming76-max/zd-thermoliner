import { supabase } from '../lib/supabase';
import type { DriverProfile } from '../lib/driverTypes';
import type {
  CompanyCard,
  DriverHrContractMetadata,
  DriverHrDocument,
  DriverHrDossier,
  DriverPayslip,
} from '../lib/driverHrTypes';
import {
  HR_COMPANY_NAME,
  HR_CONTRACT_TYPE,
  HR_DEFAULT_CARD_LIMIT,
  EMPTY_DRIVER_HR_DOSSIER,
} from '../lib/driverHrTypes';
import {
  notifyPayslipAvailable,
  notifySalaryPaidByBank,
} from './notificationService';
import { ensureDriverBankAccount } from './driverBankService';

function mapHrDocument(row: Record<string, unknown>): DriverHrDocument {
  return {
    id: row.id as string,
    driver_id: row.driver_id as string,
    profile_id: (row.profile_id as string) ?? null,
    doc_type: row.doc_type as DriverHrDocument['doc_type'],
    title: (row.title as string) ?? 'Document RH',
    status: ((row.status as string) ?? 'active') as DriverHrDocument['status'],
    metadata: (row.metadata as DriverHrContractMetadata) ?? {},
    file_url: (row.file_url as string) ?? null,
    created_at: (row.uploaded_at as string) ?? (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function mapCompanyCard(row: Record<string, unknown>): CompanyCard {
  return {
    id: row.id as string,
    driver_id: row.driver_id as string,
    profile_id: (row.profile_id as string) ?? null,
    bank_name: row.bank_name as string,
    holder_name: row.holder_name as string,
    masked_number: row.masked_number as string,
    status: row.status as CompanyCard['status'],
    spending_limit: Number(row.spending_limit ?? HR_DEFAULT_CARD_LIMIT),
    issued_at: row.issued_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapPayslipFromRow(row: Record<string, unknown>): DriverPayslip {
  return {
    id: row.id as string,
    driver_id: row.driver_id as string,
    profile_id: (row.profile_id as string) ?? null,
    month: Number(row.month),
    year: Number(row.year),
    km_total: Number(row.km_total ?? 0),
    deliveries_total: Number(row.deliveries_total ?? 0),
    bonus_amount: Number(row.bonus_amount ?? 0),
    gross_amount: Number(row.gross_amount ?? 0),
    deductions_amount: Number(row.deductions_amount ?? 0),
    net_amount: Number(row.net_amount ?? 0),
    bank_transaction_id: (row.bank_transaction_id as string) ?? null,
    salary_history_id: (row.salary_history_id as string) ?? null,
    generated_at: row.generated_at as string,
    created_at: row.created_at as string,
    payment_reference: (row.payment_reference as string) ?? null,
    bank_account_id: (row.bank_account_id as string) ?? null,
    base_salary: Number(row.base_salary ?? 0),
    km_bonus: Number(row.km_bonus ?? 0),
    delivery_bonus: Number(row.delivery_bonus ?? 0),
    extra_bonus: Number(row.extra_bonus ?? 0),
    deductions: Number(row.deductions ?? row.deductions_amount ?? 0),
    payment_transaction_id: (row.payment_transaction_id as string) ?? null,
  };
}

function buildContractMetadata(driver: DriverProfile): DriverHrContractMetadata {
  const entryDate = driver.hiring_date ?? driver.joined_at ?? new Date().toISOString();
  return {
    driver_name: driver.name,
    pseudo: driver.pseudo,
    email: driver.email,
    entry_date: entryDate,
    role: 'Chauffeur',
    company: HR_COMPANY_NAME,
    contract_type: HR_CONTRACT_TYPE,
    status: 'actif',
    admin_signature: 'Z&D Thermoliner — Direction RH',
    driver_signature: driver.name,
    signed_at: new Date().toISOString(),
  };
}

async function countDeliveriesForPeriod(
  driverId: string,
  month: number,
  year: number,
): Promise<number> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const { count } = await supabase
    .from('road_sheets')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .gte('date', start)
    .lt('date', end)
    .in('status', ['validated', 'delivered', 'completed']);

  return count ?? 0;
}

export async function ensureDriverContract(driver: DriverProfile): Promise<DriverHrDocument | null> {
  const { data: existing } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', driver.id)
    .eq('doc_type', 'contract')
    .limit(1)
    .maybeSingle();

  if (existing) return mapHrDocument(existing as Record<string, unknown>);

  const metadata = buildContractMetadata(driver);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('driver_documents')
    .insert({
      driver_id: driver.id,
      profile_id: driver.user_id,
      doc_type: 'contract',
      title: `Contrat de travail — ${driver.name}`,
      status: 'valid',
      metadata,
      notes: 'Contrat RP auto-généré',
      uploaded_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.warn('[Z&D HR] ensureDriverContract:', error.message);
    return null;
  }
  return mapHrDocument(data as Record<string, unknown>);
}

export async function ensureCompanyCard(driver: DriverProfile): Promise<CompanyCard | null> {
  const { data: existing } = await supabase
    .from('company_cards')
    .select('*')
    .eq('driver_id', driver.id)
    .maybeSingle();

  if (existing) return mapCompanyCard(existing as Record<string, unknown>);

  const { data, error } = await supabase
    .from('company_cards')
    .insert({
      driver_id: driver.id,
      profile_id: driver.user_id,
      bank_name: 'Crédit Agricole',
      holder_name: driver.name,
      masked_number: '**** **** **** 2026',
      status: 'active',
      spending_limit: HR_DEFAULT_CARD_LIMIT,
      issued_at: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) {
    console.warn('[Z&D HR] ensureCompanyCard:', error.message);
    return null;
  }
  return mapCompanyCard(data as Record<string, unknown>);
}

export async function ensureDriverHrDossier(driver: DriverProfile): Promise<void> {
  await Promise.all([
    ensureDriverContract(driver),
    ensureCompanyCard(driver),
  ]);
  if (driver.user_id) {
    await ensureDriverBankAccount(driver, { notify: false });
  }
}

export async function regenerateDriverContract(driver: DriverProfile): Promise<DriverHrDocument | null> {
  await supabase.from('driver_documents').delete().eq('driver_id', driver.id).eq('doc_type', 'contract');
  return ensureDriverContract(driver);
}

export async function regenerateCompanyCard(driver: DriverProfile): Promise<CompanyCard | null> {
  await supabase.from('company_cards').delete().eq('driver_id', driver.id);
  return ensureCompanyCard(driver);
}

export async function generatePayslipFromSalaryPayment(
  salaryRow: Record<string, unknown>,
  transactionId: string | null,
  transactionReference: string | null,
  driverTransactionId?: string | null,
): Promise<DriverPayslip | null> {
  const salaryId = salaryRow.id as string;
  const driverId = salaryRow.driver_id as string;

  const { data: existing } = await supabase
    .from('driver_payslips')
    .select('id')
    .eq('salary_history_id', salaryId)
    .maybeSingle();

  if (existing) {
    const { data: payslip } = await supabase.from('driver_payslips').select('*').eq('id', existing.id).single();
    return payslip ? mapPayslipFromRow(payslip as Record<string, unknown>) : null;
  }

  const month = Number(salaryRow.period_month);
  const year = Number(salaryRow.period_year);
  const baseSalary = Number(salaryRow.base_salary ?? 0);
  const bonus = Number(salaryRow.bonus ?? 0);
  const deliveryBonus = Number(salaryRow.delivery_bonus ?? 0);
  const penalty = Number(salaryRow.penalty ?? 0);
  const kmTotal = Number(salaryRow.km_total ?? 0);
  const netAmount = Number(salaryRow.net_amount ?? 0);
  const grossAmount = Math.round((baseSalary + bonus + deliveryBonus) * 100) / 100;
  const bonusAmount = Math.round((bonus + deliveryBonus) * 100) / 100;
  const deductions = Math.round(penalty * 100) / 100;

  const kmRate = Number(salaryRow.km_rate ?? 0);
  const kmBonus = Math.round(kmTotal * kmRate * 100) / 100;

  const deliveriesTotal = await countDeliveriesForPeriod(driverId, month, year);

  const { data: driver } = await supabase
    .from('drivers')
    .select('user_id, name')
    .eq('id', driverId)
    .maybeSingle();

  const { data: bankAccount } = driver?.user_id
    ? await supabase.from('driver_bank_accounts').select('id').eq('profile_id', driver.user_id).maybeSingle()
    : { data: null };

  const { data: payslip, error } = await supabase
    .from('driver_payslips')
    .insert({
      driver_id: driverId,
      profile_id: driver?.user_id ?? null,
      bank_account_id: bankAccount?.id ?? null,
      month,
      year,
      km_total: kmTotal,
      deliveries_total: deliveriesTotal,
      base_salary: baseSalary,
      km_bonus: kmBonus,
      delivery_bonus: deliveryBonus,
      extra_bonus: bonus,
      deductions: deductions,
      bonus_amount: bonusAmount,
      gross_amount: grossAmount,
      deductions_amount: deductions,
      net_amount: netAmount,
      bank_transaction_id: transactionId,
      payment_reference: transactionReference,
      payment_transaction_id: driverTransactionId ?? null,
      salary_history_id: salaryId,
    })
    .select()
    .single();

  if (error) {
    console.warn('[Z&D HR] generatePayslip:', error.message);
    return null;
  }

  const now = new Date().toISOString();
  const monthLabel = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  await supabase.from('driver_documents').insert({
    driver_id: driverId,
    profile_id: driver?.user_id ?? null,
    doc_type: 'payslip',
    title: `Fiche de paie — ${monthLabel}`,
    status: 'valid',
    metadata: {
      payslip_id: payslip.id,
      month,
      year,
      net_amount: netAmount,
      transaction_reference: transactionReference,
    },
    notes: `Générée automatiquement — ${monthLabel}`,
    uploaded_at: now,
    updated_at: now,
  });

  const driverUserId = driver?.user_id as string | null;
  try {
    await notifyPayslipAvailable(driverUserId);
    await notifySalaryPaidByBank(driverUserId);
  } catch { /* non-blocking */ }

  return mapPayslipFromRow(payslip as Record<string, unknown>);
}

export async function fetchDriverHrDossier(
  driverId: string,
  driverUserId: string | null,
): Promise<DriverHrDossier> {
  try {
    const [contractRes, cardRes, payslipsRes, salaryRes, notifRes] = await Promise.all([
    supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .eq('doc_type', 'contract')
      .limit(1)
      .maybeSingle(),
    supabase.from('company_cards').select('*').eq('driver_id', driverId).maybeSingle(),
    supabase
      .from('driver_payslips')
      .select('*')
      .eq('driver_id', driverId)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('driver_salary_history')
      .select('id, period_month, period_year, net_amount, payment_date, payment_status, transaction_id')
      .eq('driver_id', driverId)
      .eq('payment_status', 'paid')
      .order('payment_date', { ascending: false }),
    driverUserId
      ? supabase
          .from('notifications')
          .select('id, title, message, read, created_at')
          .eq('user_id', driverUserId)
          .in('type', ['salary', 'hr'])
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const payslips = (payslipsRes.data ?? []).map(r => mapPayslipFromRow(r as Record<string, unknown>));

  const txIds = payslips.filter(p => p.bank_transaction_id).map(p => p.bank_transaction_id!);
  let txRefMap = new Map<string, string>();
  if (txIds.length > 0) {
    const { data: txs } = await supabase.from('transactions').select('id, reference').in('id', txIds);
    txRefMap = new Map((txs ?? []).map(t => [t.id as string, (t.reference as string) ?? '']));
  }

  const enrichedPayslips = payslips.map(p => ({
    ...p,
    transaction_reference: p.bank_transaction_id ? txRefMap.get(p.bank_transaction_id) ?? null : null,
    payment_date: salaryRes.data?.find(
      s => s.id === p.salary_history_id,
    )?.payment_date as string | null ?? null,
  }));

  const salaryTxIds = (salaryRes.data ?? [])
    .filter(s => s.transaction_id)
    .map(s => s.transaction_id as string);
  let salaryTxRefMap = new Map<string, string>();
  if (salaryTxIds.length > 0) {
    const { data: stxs } = await supabase.from('transactions').select('id, reference').in('id', salaryTxIds);
    salaryTxRefMap = new Map((stxs ?? []).map(t => [t.id as string, (t.reference as string) ?? '']));
  }

  const paymentHistory = (salaryRes.data ?? []).map(s => ({
    id: s.id as string,
    month: Number(s.period_month),
    year: Number(s.period_year),
    net_amount: Number(s.net_amount ?? 0),
    payment_date: (s.payment_date as string) ?? null,
    transaction_reference: s.transaction_id
      ? salaryTxRefMap.get(s.transaction_id as string) ?? null
      : null,
  }));

  return {
    contract: contractRes.data ? mapHrDocument(contractRes.data as Record<string, unknown>) : null,
    companyCard: cardRes.data ? mapCompanyCard(cardRes.data as Record<string, unknown>) : null,
    payslips: enrichedPayslips,
    paymentHistory,
    hrNotifications: (notifRes.data ?? []) as DriverHrDossier['hrNotifications'],
  };
  } catch (err) {
    console.warn('[Z&D HR] fetchDriverHrDossier failed:', err);
    return { ...EMPTY_DRIVER_HR_DOSSIER };
  }
}

export async function fetchPayslipTransactionReference(payslip: DriverPayslip): Promise<string | null> {
  if (!payslip.bank_transaction_id) return null;
  const { data } = await supabase
    .from('transactions')
    .select('reference')
    .eq('id', payslip.bank_transaction_id)
    .maybeSingle();
  return (data?.reference as string) ?? null;
}
