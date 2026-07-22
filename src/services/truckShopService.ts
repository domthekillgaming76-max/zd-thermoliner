import { supabase } from '../lib/supabase';
import type { TruckEquipmentItem, TruckEquipmentPurchase, TruckShopBundle } from '../lib/truckShopTypes';

function mapItem(row: Record<string, unknown>): TruckEquipmentItem {
  return {
    id: row.id as string, name: row.name as string, description: (row.description as string) ?? null,
    category: row.category as string, location: row.location as TruckEquipmentItem['location'],
    price: Number(row.price ?? 0), emoji: (row.emoji as string) ?? '🔧',
    stock: row.stock == null ? null : Number(row.stock), enabled: row.enabled !== false,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapPurchase(row: Record<string, unknown>): TruckEquipmentPurchase {
  return {
    id: row.id as string, profile_id: row.profile_id as string, item_id: row.item_id as string,
    item_name: row.item_name as string, category: row.category as string,
    location: row.location as TruckEquipmentPurchase['location'], price_paid: Number(row.price_paid ?? 0),
    balance_after: Number(row.balance_after ?? 0), receipt_number: row.receipt_number as string,
    purchased_at: row.purchased_at as string,
  };
}

export async function fetchTruckShop(profileId: string): Promise<TruckShopBundle> {
  const [catalogRes, purchasesRes, accountRes] = await Promise.all([
    supabase.from('truck_equipment_catalog').select('*').eq('enabled', true).order('location').order('category').order('sort_order'),
    supabase.from('driver_truck_equipment').select('*').eq('profile_id', profileId).order('purchased_at', { ascending: false }).limit(100),
    supabase.from('driver_bank_accounts').select('account_number,holder_name,balance,status').eq('profile_id', profileId).maybeSingle(),
  ]);
  if (catalogRes.error) throw catalogRes.error;
  if (purchasesRes.error) throw purchasesRes.error;
  return {
    catalog: (catalogRes.data ?? []).map(row => mapItem(row as Record<string, unknown>)),
    purchases: (purchasesRes.data ?? []).map(row => mapPurchase(row as Record<string, unknown>)),
    account: accountRes.data ? {
      account_number: accountRes.data.account_number as string,
      holder_name: accountRes.data.holder_name as string,
      balance: Number(accountRes.data.balance ?? 0), status: accountRes.data.status as string,
    } : null,
  };
}

export async function purchaseTruckEquipment(itemId: string): Promise<TruckEquipmentPurchase> {
  const { data, error } = await supabase.rpc('purchase_truck_equipment', { p_item_id: itemId });
  if (error) throw error;
  const result = data as { ok?: boolean; purchase?: Record<string, unknown>; error?: string } | null;
  if (!result?.ok || !result.purchase) throw new Error(result?.error ?? 'Achat impossible.');
  return mapPurchase(result.purchase);
}
