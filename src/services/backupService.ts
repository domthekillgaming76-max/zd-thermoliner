import { supabase } from '../lib/supabase';

const BACKUP_KEY = 'zd-erp-backup-latest';
const BACKUP_INTERVAL_MS = 5 * 60_000;

export interface ErpBackupSnapshot {
  saved_at: string;
  balance: number | null;
  drivers: number;
  trucks: number;
  pending_sheets: number;
  active_missions: number;
  freight_available: number;
}

export async function captureErpSnapshot(): Promise<ErpBackupSnapshot> {
  const [bank, drivers, trucks, sheets, missions, freight] = await Promise.all([
    supabase.from('company_bank_account').select('balance').limit(1).maybeSingle(),
    supabase.from('drivers').select('id', { count: 'exact', head: true }),
    supabase.from('trucks').select('id', { count: 'exact', head: true }),
    supabase.from('road_sheets').select('id', { count: 'exact', head: true }).eq('validated', false),
    supabase.from('transport_missions').select('id', { count: 'exact', head: true }).in('status', ['assigned', 'in_progress', 'planned']),
    supabase.from('freight_offers').select('id', { count: 'exact', head: true }).in('status', ['available', 'reserved']),
  ]);

  return {
    saved_at: new Date().toISOString(),
    balance: bank.data?.balance != null ? Number(bank.data.balance) : null,
    drivers: drivers.count ?? 0,
    trucks: trucks.count ?? 0,
    pending_sheets: sheets.count ?? 0,
    active_missions: missions.count ?? 0,
    freight_available: freight.count ?? 0,
  };
}

export async function runAutoBackup(isAdmin: boolean): Promise<void> {
  try {
    const snapshot = await captureErpSnapshot();
    localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));

    if (isAdmin) {
      try {
        await supabase.rpc('log_erp_backup_snapshot', { p_snapshot: snapshot });
      } catch {
        /* RPC optional until migration applied */
      }
    }
  } catch (err) {
    console.warn('[Z&D Backup] snapshot failed:', err);
  }
}

export function getLastLocalBackup(): ErpBackupSnapshot | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ErpBackupSnapshot;
  } catch {
    return null;
  }
}

export { BACKUP_INTERVAL_MS };
