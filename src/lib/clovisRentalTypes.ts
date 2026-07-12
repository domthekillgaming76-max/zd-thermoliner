export interface ClovisCatalogItem {
  id: string;
  agency_name: string;
  label: string;
  brand: string;
  model: string;
  variant: string | null;
  description: string | null;
  daily_rate: number;
  power_hp: number | null;
  fuel_type: string | null;
  transmission: string | null;
  accent_color: string;
  badge: string | null;
  photo_url: string | null;
  enabled: boolean;
  sort_order: number;
}

export interface ClovisActiveRental {
  id: string;
  catalog_id: string;
  profile_id: string;
  driver_id: string;
  status: 'active' | 'returned' | 'suspended';
  daily_rate: number;
  vehicle_label: string;
  started_at: string;
  returned_at: string | null;
  last_charge_date: string | null;
  total_charged: number;
  days_rented: number;
  contract_ref: string;
  catalog?: ClovisCatalogItem;
}

export interface ClovisRentalCharge {
  id: string;
  rental_id: string;
  charge_date: string;
  amount: number;
  reference: string;
  created_at: string;
}

export interface ClovisRentalBundle {
  catalog: ClovisCatalogItem[];
  activeRental: ClovisActiveRental | null;
  recentCharges: ClovisRentalCharge[];
  companyBalance: number | null;
  migrationRequired: boolean;
}

export const CLOVIS_DAILY_RATE = 450;

export const CLOVIS_STEAM_MOD_URL =
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3636691159';

export interface ClovisRentalStartResult {
  ok: boolean;
  rental_id: string;
  contract_ref: string;
  daily_rate: number;
  vehicle_label: string;
  message: string;
}
