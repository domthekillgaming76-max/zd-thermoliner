import { supabase } from '../lib/supabase';
import { computeDriverStatistics } from '../lib/driverTypes';
import type { RoadSheet } from '../lib/supabase';

export interface ProfileCardStats {
  totalKm: number;
  deliveries: number;
  revenueGenerated: number;
  hasDriverRecord: boolean;
}

const EMPTY_STATS: ProfileCardStats = {
  totalKm: 0,
  deliveries: 0,
  revenueGenerated: 0,
  hasDriverRecord: false,
};

export async function fetchProfileCardStats(userId: string): Promise<ProfileCardStats> {
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id, total_km, monthly_km, deliveries_count, driving_hours_month, driver_level')
    .eq('user_id', userId)
    .maybeSingle();

  if (driverError) {
    console.warn('[Z&D] fetchProfileCardStats driver lookup', driverError.message);
    return EMPTY_STATS;
  }

  if (!driver) return EMPTY_STATS;

  const { data: sheets, error: sheetsError } = await supabase
    .from('road_sheets')
    .select('id, km, total_distance, revenue, net_profit, fuel_cost, validated, status, date')
    .eq('driver_id', driver.id);

  if (sheetsError) {
    console.warn('[Z&D] fetchProfileCardStats road sheets', sheetsError.message);
    return {
      totalKm: Number(driver.total_km ?? 0),
      deliveries: Number(driver.deliveries_count ?? 0),
      revenueGenerated: 0,
      hasDriverRecord: true,
    };
  }

  const stats = computeDriverStatistics(
    {
      id: driver.id,
      user_id: userId,
      name: '',
      pseudo: null,
      photo_url: null,
      avatar_url: null,
      phone: null,
      license_number: null,
      truck_id: null,
      garage_id: null,
      status: 'active',
      monthly_km: Number(driver.monthly_km ?? 0),
      total_km: Number(driver.total_km ?? 0),
      deliveries_count: Number(driver.deliveries_count ?? 0),
      profile_description: null,
      joined_at: '',
      created_at: '',
      email: null,
      address: null,
      city: null,
      postal_code: null,
      country: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      employment_contract: null,
      salary_mode: 'fixed',
      salary_base: 0,
      driver_level: Number(driver.driver_level ?? 1),
      experience_years: 0,
      license_categories: null,
      license_expires_at: null,
      has_adr: false,
      dangerous_goods_authorized: false,
      driving_status: 'resting',
      presence_status: 'offline',
      member_role: 'chauffeur',
      trailer_id: null,
      driving_hours_month: Number(driver.driving_hours_month ?? 0),
      rest_hours_month: 0,
      is_active_driver: true,
      is_suspended: false,
      banner_url: null,
      date_of_birth: null,
      discord_name: null,
      truckersmp_id: null,
      steam_id: null,
      employee_number: null,
      hiring_date: null,
      eco_driving_score: 0,
      driver_rating: 0,
      fleet_name: null,
      last_seen_at: null,
    },
    (sheets ?? []) as RoadSheet[],
  );

  return {
    totalKm: stats.totalKm,
    deliveries: stats.deliveries,
    revenueGenerated: stats.revenueGenerated,
    hasDriverRecord: true,
  };
}

export async function touchProfileLastSeen(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.warn('[Z&D] touchProfileLastSeen failed', error.message);
  }
}
