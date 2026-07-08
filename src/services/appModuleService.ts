import { supabase } from '../lib/supabase';
import { DEFAULT_APP_MODULES } from '../lib/defaultAppModules';

export interface AppModuleRecord {
  id: string;
  key: string;
  label: string;
  category: string;
  icon: string;
  route: string;
  enabled: boolean;
  sort_order: number;
  allowed_roles: string[];
  admin_only: boolean;
  created_at: string;
  updated_at: string;
}

export type AppModuleInput = Pick<
  AppModuleRecord,
  'key' | 'label' | 'category' | 'icon' | 'route' | 'enabled' | 'sort_order' | 'allowed_roles' | 'admin_only'
>;

function rowToModule(row: Record<string, unknown>): AppModuleRecord {
  return {
    id: row.id as string,
    key: row.key as string,
    label: row.label as string,
    category: row.category as string,
    icon: (row.icon as string) ?? 'HelpCircle',
    route: row.route as string,
    enabled: row.enabled !== false,
    sort_order: Number(row.sort_order ?? 0),
    allowed_roles: Array.isArray(row.allowed_roles) ? (row.allowed_roles as string[]) : [],
    admin_only: Boolean(row.admin_only),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function fallbackModules(): AppModuleRecord[] {
  const now = new Date().toISOString();
  return DEFAULT_APP_MODULES.map((m, i) => ({
    ...m,
    id: `default-${m.key}`,
    created_at: now,
    updated_at: now,
    sort_order: m.sort_order ?? i * 10,
  }));
}

export async function fetchAppModules(): Promise<AppModuleRecord[]> {
  const { data, error } = await supabase
    .from('app_modules')
    .select('*')
    .order('category')
    .order('sort_order');

  if (error) {
    console.warn('[Z&D Modules] fetch failed, using defaults:', error.message);
    return fallbackModules();
  }

  if (!data?.length) return fallbackModules();
  return data.map(row => rowToModule(row as Record<string, unknown>));
}

export async function updateAppModule(id: string, patch: Partial<AppModuleInput>): Promise<AppModuleRecord> {
  const { data, error } = await supabase
    .from('app_modules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToModule(data as Record<string, unknown>);
}

export async function swapModuleOrder(idA: string, orderA: number, idB: string, orderB: number): Promise<void> {
  const now = new Date().toISOString();
  const [resA, resB] = await Promise.all([
    supabase.from('app_modules').update({ sort_order: orderB, updated_at: now }).eq('id', idA),
    supabase.from('app_modules').update({ sort_order: orderA, updated_at: now }).eq('id', idB),
  ]);
  if (resA.error) throw resA.error;
  if (resB.error) throw resB.error;
}

export async function createAppModule(input: AppModuleInput): Promise<AppModuleRecord> {
  const { data, error } = await supabase
    .from('app_modules')
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select('*')
    .single();

  if (error) throw error;
  return rowToModule(data as Record<string, unknown>);
}

export function getModuleCategories(modules: AppModuleRecord[]): string[] {
  return [...new Set(modules.map(m => m.category))].sort((a, b) => a.localeCompare(b, 'fr'));
}
