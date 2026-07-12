import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Z&D] Variables Supabase manquantes.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type Driver = {
  id: string;
  user_id: string | null;
  name: string;
  pseudo: string | null;
  photo_url: string | null;
  avatar_url: string | null;
  phone: string | null;
  license_number: string | null;
  truck_id: string | null;
  garage_id: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  monthly_km: number;
  total_km: number;
  deliveries_count: number;
  profile_description: string | null;
  joined_at: string;
  created_at: string;
};

export type Garage = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  photo_url: string | null;
  monthly_rent: number;
  is_active: boolean;
  created_at: string;
};

export type Truck = {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  photo_url: string | null;
  driver_id: string | null;
  garage_id: string | null;
  status: 'active' | 'maintenance' | 'retired';
  mileage: number;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  photo_url: string | null;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    pseudo: string | null;
    avatar_url: string | null;
  };
  likes: { user_id: string }[];
  comments: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profiles: { full_name: string; pseudo: string | null; avatar_url: string | null };
  }[];
};

export type TransactionType =
  | 'income'
  | 'expense'
  | 'salary'
  | 'bonus'
  | 'penalty'
  | 'fuel'
  | 'toll'
  | 'maintenance'
  | 'rent'
  | 'insurance'
  | 'tax'
  | 'transfer';

export type Transaction = {
  id: string;
  user_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  created_at: string;
  driver_id?: string | null;
  road_sheet_id?: string | null;
  truck_id?: string | null;
  garage_id?: string | null;
  created_by?: string | null;
  reference?: string | null;
  balance_after?: number | null;
  auto_generated?: boolean | null;
  status?: 'posted' | 'pending' | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CompanyBankAccount = {
  id: string;
  account_name: string;
  iban_rp: string;
  balance: number;
  updated_at: string;
};

export type BankStatement = {
  id: string;
  month: number;
  year: number;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  total_salary: number;
  total_fuel: number;
  total_toll: number;
  total_maintenance: number;
  total_rent: number;
  closing_balance: number;
  net_profit: number;
  generated_at: string;
  total_transactions?: number | null;
};

export type RoadSheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'validated';

export type DriverSalaryMode = 'fixed' | 'percentage' | 'per_km';

export type RoadSheet = {
  id: string;
  driver_id?: string | null;
  driver_user_id: string | null;
  driver_name: string | null;
  truck_id?: string | null;
  trailer_type?: string | null;
  departure: string | null;
  arrival: string | null;
  cargo: string | null;
  km: number;
  price_per_km: number;
  revenue: number;
  fuel_consumption_l100?: number | null;
  fuel_price_per_liter?: number | null;
  fuel_liters?: number | null;
  fuel_cost?: number | null;
  toll_cost?: number | null;
  toll_cost_calc?: number | null;
  repair_cost?: number | null;
  wear_cost?: number | null;
  other_expenses?: number | null;
  insurance_cost?: number | null;
  driver_salary?: number | null;
  driver_bonus?: number | null;
  driver_salary_mode?: DriverSalaryMode | null;
  driver_salary_value?: number | null;
  total_expenses?: number | null;
  net_profit?: number | null;
  margin_percent?: number | null;
  cost_per_km?: number | null;
  economics_calculated?: boolean | null;
  delivery_photo_url: string | null;
  validated: boolean;
  status?: RoadSheetStatus | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  notes: string | null;
  date: string;
  created_at: string;
  // legacy fields from old schema (may be null)
  total_distance?: number;
  departure_city?: string | null;
  arrival_city?: string | null;
  cargo_type?: string | null;
};

export type VTCSettings = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  monthly_distance_goal: number;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  pseudo: string | null;
  avatar_url: string | null;
  theme_color: string;
  truck_photo_url: string | null;
  role: string;
  application_status?: string | null;
  bio?: string | null;
  country?: string | null;
  discord_name?: string | null;
  truckersmp_id?: string | null;
  favorite_truck?: string | null;
  favorite_trailer?: string | null;
  profile_theme?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  background_style?: string | null;
  card_style?: string | null;
  banner_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type RecruitmentApplication = {
  id: string;
  user_id: string;
  pseudo: string;
  email: string;
  age: number;
  ets2_experience: string;
  has_trucksbook: boolean;
  trucksbook_profile: string | null;
  discord: string;
  motivation: string;
  preferred_truck: string | null;
  availability: string | null;
  status: 'pending' | 'approved' | 'rejected';
  assigned_role: 'chauffeur' | 'tractionnaire';
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
};

export type ChatRoom = {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private' | 'direct';
  created_by: string | null;
  created_at: string;
  icon: string | null;
  accent_color: string | null;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  edited_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    pseudo: string | null;
    avatar_url: string | null;
  };
};

export type Medal = {
  id: string;
  driver_id: string;
  type: 'gold' | 'silver' | 'bronze';
  month: number;
  year: number;
  distance: number;
  deliveries: number;
  reason: string | null;
  created_at: string;
};

export type CompanyBudget = {
  id: string;
  month: number;
  year: number;
  opening_balance: number;
  income: number;
  expenses: number;
  closing_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyExpense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  approved_by: string | null;
  status: 'pending' | 'approved' | 'paid';
  receipt_url: string | null;
  created_by: string;
  created_at: string;
};
