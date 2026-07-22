export type TruckEquipmentLocation = 'interior' | 'exterior';

export interface TruckEquipmentItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  location: TruckEquipmentLocation;
  price: number;
  emoji: string;
  stock: number | null;
  enabled: boolean;
  sort_order: number;
}

export interface TruckEquipmentPurchase {
  id: string;
  profile_id: string;
  item_id: string;
  item_name: string;
  category: string;
  location: TruckEquipmentLocation;
  price_paid: number;
  balance_after: number;
  receipt_number: string;
  purchased_at: string;
}

export interface TruckShopBundle {
  catalog: TruckEquipmentItem[];
  purchases: TruckEquipmentPurchase[];
  account: { account_number: string; holder_name: string; balance: number; status: string } | null;
}
