import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Z&D] Variables Supabase manquantes.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
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

export type Transaction = {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  created_at: string;
};

export type RoadSheet = {
  id: string;
  driver_user_id: string | null;
  driver_name: string | null;
  departure: string | null;
  arrival: string | null;
  cargo: string | null;
  km: number;
  price_per_km: number;
  revenue: number;
  delivery_photo_url: string | null;
  validated: boolean;
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
