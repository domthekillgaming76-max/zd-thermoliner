import type { PostgrestError } from '@supabase/supabase-js';
import { supabase, type RoadSheet, type TransactionType } from './supabase';
import {
  isMissingColumnError,
  logSupabaseError,
} from './transactionSchema';

export { logSupabaseError } from './transactionSchema';

/** Columns present in base schema + migration 006 (status is migration 019). */
export interface TransactionInsertRow {
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  driver_id?: string | null;
  road_sheet_id?: string | null;
  auto_generated?: boolean;
  created_by?: string | null;
  reference?: string | null;
}

export const ROAD_SHEET_TX_CATEGORIES: Record<string, string> = {
  income: 'Transport',
  fuel: 'Carburant',
  toll: 'Péages',
  maintenance: 'Réparations',
  insurance: 'Assurance',
  salary: 'Salaires',
  expense: 'Autres',
};

const GRANULAR_DEBIT_TYPES: TransactionType[] = [
  'fuel',
  'toll',
  'maintenance',
  'insurance',
  'salary',
];

export async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('Vous devez être connecté pour synchroniser la banque.');
  }
  return data.user.id;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().split('T')[0];
  return value.split('T')[0];
}

export interface SheetTransactionLine {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
}

export function buildRoadSheetTransactionLines(sheet: RoadSheet): SheetTransactionLine[] {
  const driverName = sheet.driver_name ?? 'Chauffeur';
  const departure = sheet.departure ?? sheet.departure_city ?? 'Départ';
  const arrival = sheet.arrival ?? sheet.arrival_city ?? 'Arrivée';

  const revenue = Number(sheet.revenue || 0);
  const fuel = Number(sheet.fuel_cost || 0);
  const toll = Number(sheet.toll_cost || 0) || Number(sheet.toll_cost_calc || 0);
  const repair = Number(sheet.repair_cost || 0) || Number(sheet.wear_cost || 0);
  const insurance = Number(sheet.insurance_cost || 0);
  const salary = Number(sheet.driver_salary || 0) || Number(sheet.driver_bonus || 0);
  const other = Number(sheet.other_expenses || 0);

  const lines: SheetTransactionLine[] = [];

  if (revenue > 0) {
    lines.push({
      type: 'income',
      amount: round2(revenue),
      description: `Feuille de route ${departure} → ${arrival}`,
      category: ROAD_SHEET_TX_CATEGORIES.income,
    });
  }
  if (fuel > 0) {
    lines.push({
      type: 'fuel',
      amount: round2(fuel),
      description: `Carburant — ${driverName}`,
      category: ROAD_SHEET_TX_CATEGORIES.fuel,
    });
  }
  if (toll > 0) {
    lines.push({
      type: 'toll',
      amount: round2(toll),
      description: `Péages — ${driverName}`,
      category: ROAD_SHEET_TX_CATEGORIES.toll,
    });
  }
  if (repair > 0) {
    lines.push({
      type: 'maintenance',
      amount: round2(repair),
      description: `Réparations — ${driverName}`,
      category: ROAD_SHEET_TX_CATEGORIES.maintenance,
    });
  }
  if (insurance > 0) {
    lines.push({
      type: 'insurance',
      amount: round2(insurance),
      description: `Assurance — ${driverName}`,
      category: ROAD_SHEET_TX_CATEGORIES.insurance,
    });
  }
  if (salary > 0) {
    lines.push({
      type: 'salary',
      amount: round2(salary),
      description: `Salaire chauffeur — ${driverName}`,
      category: ROAD_SHEET_TX_CATEGORIES.salary,
    });
  }
  if (other > 0) {
    lines.push({
      type: 'expense',
      amount: round2(other),
      description: `Autres dépenses — ${driverName}`,
      category: ROAD_SHEET_TX_CATEGORIES.expense,
    });
  }

  return lines;
}

export function buildRoadSheetTransactionRows(
  sheet: RoadSheet,
  actorUserId: string,
  lines: SheetTransactionLine[],
): TransactionInsertRow[] {
  const reference = `RS-${sheet.id.slice(0, 8)}`;
  const date = normalizeDate(sheet.date);

  return lines.map(line => ({
    user_id: actorUserId,
    type: line.type,
    amount: line.amount,
    description: line.description,
    category: line.category,
    date,
    driver_id: sheet.driver_id ?? null,
    road_sheet_id: sheet.id,
    auto_generated: true,
    created_by: actorUserId,
    reference,
  }));
}

function isTypeConstraintError(error: PostgrestError): boolean {
  return error.code === '23514' || error.message?.toLowerCase().includes('transactions_type_check');
}

function stripOptionalColumns(row: TransactionInsertRow): Record<string, unknown> {
  return {
    user_id: row.user_id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    category: row.category,
    date: row.date,
  };
}

function toFallbackExpenseType(type: TransactionType): TransactionType {
  return type === 'income' ? 'income' : 'expense';
}

export async function insertTransactionRow(row: TransactionInsertRow): Promise<void> {
  let payload: Record<string, unknown> = { ...row };
  let result = await supabase.from('transactions').insert(payload);

  if (result.error && isMissingColumnError(result.error)) {
    logSupabaseError('insertTransactionRow retry minimal columns', result.error);
    payload = stripOptionalColumns(row);
    result = await supabase.from('transactions').insert(payload);
  }

  if (result.error && isTypeConstraintError(result.error) && GRANULAR_DEBIT_TYPES.includes(row.type)) {
    logSupabaseError('insertTransactionRow retry expense type', result.error);
    const base = isMissingColumnError(result.error) ? stripOptionalColumns(row) : { ...row };
    payload = {
      ...base,
      type: toFallbackExpenseType(row.type),
    };
    result = await supabase.from('transactions').insert(payload);
  }

  if (result.error?.code === '23505') {
    logSupabaseError('insertTransactionRow duplicate skipped', result.error);
    return;
  }

  if (result.error) {
    logSupabaseError('insertTransactionRow failed', result.error);
    throw result.error;
  }
}
