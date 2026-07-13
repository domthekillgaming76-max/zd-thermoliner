import { supabase } from '../lib/supabase';
import type { MealCatalogItem, MealOrder, MealStoreBundle } from '../lib/mealTypes';

function mapCatalog(row: Record<string, unknown>): MealCatalogItem {
  return {
    id: row.id as string,
    restaurant: row.restaurant as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    category: row.category as MealCatalogItem['category'],
    price: Number(row.price ?? 0),
    emoji: (row.emoji as string) ?? '🍽️',
    enabled: row.enabled !== false,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapOrder(row: Record<string, unknown>): MealOrder {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    driver_account_id: row.driver_account_id as string,
    driver_transaction_id: (row.driver_transaction_id as string) ?? null,
    restaurant: row.restaurant as string,
    receipt_number: row.receipt_number as string,
    items: (Array.isArray(row.items) ? row.items : []) as MealOrder['items'],
    total_amount: Number(row.total_amount ?? 0),
    balance_after: Number(row.balance_after ?? 0),
    payment_method: (row.payment_method as string) ?? 'Carte chauffeur',
    created_at: row.created_at as string,
  };
}

export async function fetchMealCatalog(): Promise<MealCatalogItem[]> {
  const { data, error } = await supabase
    .from('meal_catalog')
    .select('*')
    .eq('enabled', true)
    .order('restaurant')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map(row => mapCatalog(row as Record<string, unknown>));
}

export async function fetchMealOrders(profileId: string, limit = 50): Promise<MealOrder[]> {
  const { data, error } = await supabase
    .from('meal_orders')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(row => mapOrder(row as Record<string, unknown>));
}

export async function fetchMealStore(profileId: string): Promise<MealStoreBundle> {
  const [catalog, orders, accountRes] = await Promise.all([
    fetchMealCatalog(),
    fetchMealOrders(profileId, 20),
    supabase
      .from('driver_bank_accounts')
      .select('account_number,holder_name,balance,status')
      .eq('profile_id', profileId)
      .maybeSingle(),
  ]);

  return {
    catalog,
    orders,
    account: accountRes.data
      ? {
          account_number: accountRes.data.account_number as string,
          holder_name: accountRes.data.holder_name as string,
          balance: Number(accountRes.data.balance ?? 0),
          status: accountRes.data.status as string,
        }
      : null,
  };
}

export async function purchaseMeals(itemIds: string[]): Promise<MealOrder> {
  const { data, error } = await supabase.rpc('purchase_meal_order', { p_item_ids: itemIds });
  if (error) throw error;
  const result = data as { ok?: boolean; order?: Record<string, unknown>; error?: string } | null;
  if (!result?.ok || !result.order) throw new Error(result?.error ?? 'Achat impossible.');
  return mapOrder(result.order);
}
