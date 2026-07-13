export type MealCategory = 'meal' | 'formula' | 'drink' | 'dessert' | 'snack';

export interface MealCatalogItem {
  id: string;
  restaurant: string;
  name: string;
  description: string | null;
  category: MealCategory;
  price: number;
  emoji: string;
  enabled: boolean;
  sort_order: number;
}

export interface MealReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface MealOrder {
  id: string;
  profile_id: string;
  driver_account_id: string;
  driver_transaction_id: string | null;
  restaurant: string;
  receipt_number: string;
  items: MealReceiptItem[];
  total_amount: number;
  balance_after: number;
  payment_method: string;
  created_at: string;
}

export interface MealStoreBundle {
  catalog: MealCatalogItem[];
  orders: MealOrder[];
  account: {
    account_number: string;
    holder_name: string;
    balance: number;
    status: string;
  } | null;
}
