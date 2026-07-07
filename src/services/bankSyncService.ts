import { isCreditTransaction, isDebitTransaction } from '../lib/bankUtils';

import type { CompanyBankAccount } from '../lib/supabase';

import type { TransactionType } from '../lib/supabase';

import {

  buildRoadSheetTransactionLines,

  buildRoadSheetTransactionRows,

  getAuthenticatedUserId,

  insertTransactionRow,

} from '../lib/transactionInsert';

import {

  fetchExistingRoadSheetTransactionTypes,

  fetchSyncedRoadSheetIds,

  fetchTransactionAmountsForBalance,

  logSupabaseError,

} from '../lib/transactionSchema';

import { supabase, type RoadSheet } from '../lib/supabase';



export interface SyncResult {

  processed: number;

  skipped: number;

}



function round2(n: number): number {

  return Math.round(n * 100) / 100;

}



async function fetchCompanyAccountLocal(): Promise<CompanyBankAccount | null> {

  const { data, error } = await supabase

    .from('company_bank_account')

    .select('id,account_name,iban_rp,balance,updated_at')

    .limit(1)

    .maybeSingle();



  if (error) {

    logSupabaseError('fetchCompanyAccountLocal', error);

    return null;

  }

  return (data as CompanyBankAccount) ?? null;

}



function isValidatedSheet(sheet: RoadSheet): boolean {

  return sheet.validated === true || sheet.status === 'approved' || sheet.status === 'validated';

}



async function fetchValidatedRoadSheets(): Promise<RoadSheet[]> {

  const { data, error } = await supabase

    .from('road_sheets')

    .select('*')

    .or('validated.eq.true,status.eq.approved,status.eq.validated')

    .order('date', { ascending: true })

    .order('created_at', { ascending: true });



  if (error) {

    logSupabaseError('fetchValidatedRoadSheets', error);

    throw error;

  }



  return ((data ?? []) as RoadSheet[]).filter(isValidatedSheet);

}



async function fetchRoadSheetById(sheetId: string): Promise<RoadSheet | null> {

  const { data, error } = await supabase.from('road_sheets').select('*').eq('id', sheetId).maybeSingle();



  if (error) {

    logSupabaseError('fetchRoadSheetById for bank sync', error);

    throw error;

  }



  return (data as RoadSheet | null) ?? null;

}



export async function recalculateCompanyBalanceFromTransactions(): Promise<number> {

  const rows = await fetchTransactionAmountsForBalance();



  const balance = rows.reduce((sum, tx) => {

    if (tx.status && tx.status !== 'posted') return sum;

    const amount = Number(tx.amount);

    const type = tx.type as TransactionType;

    if (isCreditTransaction({ type })) return sum + amount;

    if (isDebitTransaction({ type })) return sum - amount;

    return sum;

  }, 0);



  const rounded = round2(balance);

  const account = await fetchCompanyAccountLocal();



  if (account) {

    const { error: updateError } = await supabase

      .from('company_bank_account')

      .update({ balance: rounded, updated_at: new Date().toISOString() })

      .eq('id', account.id);



    if (updateError) logSupabaseError('recalculateCompanyBalance update', updateError);

  } else {

    const { error: insertError } = await supabase.from('company_bank_account').insert({

      account_name: 'Z&D Thermoliner',

      iban_rp: 'FR76 3000 2999 0000 0000 0000 000',

      balance: rounded,

    });



    if (insertError) logSupabaseError('recalculateCompanyBalance insert', insertError);

  }



  return rounded;

}



async function syncSheetTransactions(

  sheet: RoadSheet,

  actorUserId: string,

): Promise<'processed' | 'skipped' | 'failed'> {

  const existingTypes = await fetchExistingRoadSheetTransactionTypes(sheet.id);

  if (existingTypes.size > 0) {

    return 'skipped';

  }



  const lines = buildRoadSheetTransactionLines(sheet);

  if (lines.length === 0) {

    return 'skipped';

  }



  const rows = buildRoadSheetTransactionRows(sheet, actorUserId, lines);



  try {

    for (const row of rows) {

      if (existingTypes.has(row.type)) continue;

      await insertTransactionRow(row);

      existingTypes.add(row.type);

    }

    return 'processed';

  } catch (error) {

    console.error('[Z&D] syncSheetTransactions failed for sheet', sheet.id, error);

    return 'failed';

  }

}



export async function syncRoadSheetToBank(sheetId: string): Promise<SyncResult> {

  const actorUserId = await getAuthenticatedUserId();

  const sheet = await fetchRoadSheetById(sheetId);



  if (!sheet) {

    throw new Error('Feuille de route introuvable pour la synchronisation bancaire.');

  }



  if (!isValidatedSheet(sheet)) {

    return { processed: 0, skipped: 1 };

  }



  const outcome = await syncSheetTransactions(sheet, actorUserId);



  if (outcome === 'failed') {

    throw new Error('Synchronisation bancaire échouée.');

  }



  try {

    await recalculateCompanyBalanceFromTransactions();

  } catch (error) {

    console.error('[Z&D] recalculateCompanyBalanceFromTransactions after single sync:', error);

  }



  return {

    processed: outcome === 'processed' ? 1 : 0,

    skipped: outcome === 'skipped' ? 1 : 0,

  };

}



export async function syncValidatedRoadSheetsToBankLocal(): Promise<SyncResult> {

  const actorUserId = await getAuthenticatedUserId();



  const [sheets, syncedIds] = await Promise.all([

    fetchValidatedRoadSheets(),

    fetchSyncedRoadSheetIds(),

  ]);



  let processed = 0;

  let skipped = 0;



  for (const sheet of sheets) {

    if (syncedIds.has(sheet.id)) {

      skipped++;

      continue;

    }



    const outcome = await syncSheetTransactions(sheet, actorUserId);

    if (outcome === 'processed') {

      syncedIds.add(sheet.id);

      processed++;

    } else if (outcome === 'skipped') {

      skipped++;

      syncedIds.add(sheet.id);

    }

  }



  try {

    await recalculateCompanyBalanceFromTransactions();

  } catch (error) {

    console.error('[Z&D] recalculateCompanyBalanceFromTransactions after sync:', error);

  }



  if (processed > 0) {

    console.log('[Z&D] Bank direct sync complete:', { processed, skipped });

  }



  return { processed, skipped };

}



function isMissingRpcError(error: { message?: string; code?: string }): boolean {

  const msg = error.message?.toLowerCase() ?? '';

  return (

    error.code === 'PGRST202' ||

    msg.includes('could not find the function') ||

    msg.includes('schema cache')

  );

}



export async function syncValidatedRoadSheetsToBank(): Promise<SyncResult> {

  const { data, error } = await supabase.rpc('sync_validated_road_sheets_bank');



  if (!error) {

    const result = data as { processed?: number; skipped?: number } | null;

    return {

      processed: result?.processed ?? 0,

      skipped: result?.skipped ?? 0,

    };

  }



  logSupabaseError('syncValidatedRoadSheetsToBank RPC', error);



  if (isMissingRpcError(error)) {

    console.info('[Z&D] Bank sync RPC unavailable, using direct service sync.');

  }



  return syncValidatedRoadSheetsToBankLocal();

}


