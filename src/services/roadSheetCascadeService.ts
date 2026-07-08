import { supabase } from '../lib/supabase';
import type { RoadSheet } from '../lib/supabase';
import { monthKey } from '../lib/format';

function sheetKm(sheet: RoadSheet): number {
  return Math.max(0, Math.round(Number(sheet.km ?? sheet.total_distance ?? 0)));
}

function isValidatedSheet(sheet: RoadSheet): boolean {
  return sheet.validated === true || sheet.status === 'validated' || sheet.status === 'approved';
}

/** Persist driver + truck operational counters after validation (idempotent). */
export async function syncOperationalStatsFromValidatedRoadSheet(sheet: RoadSheet): Promise<void> {
  if (!isValidatedSheet(sheet) || !sheet.driver_id) return;

  const km = sheetKm(sheet);
  if (km <= 0) return;

  const { data: existing } = await supabase
    .from('road_sheets')
    .select('id, validated, status')
    .eq('id', sheet.id)
    .maybeSingle();

  if (!existing || !(existing.validated || existing.status === 'validated' || existing.status === 'approved')) {
    return;
  }

  const month = monthKey();
  const sheetMonth = (sheet.date ?? sheet.created_at ?? '').slice(0, 7);
  const isCurrentMonth = sheetMonth === month;

  const { data: driver } = await supabase
    .from('drivers')
    .select('id, total_km, monthly_km, deliveries_count, driving_hours_month')
    .eq('id', sheet.driver_id)
    .maybeSingle();

  if (driver) {
    const hoursAdd = Math.round((km / 80) * 10) / 10;
    await supabase.from('drivers').update({
      total_km: Number(driver.total_km ?? 0) + km,
      monthly_km: isCurrentMonth ? Number(driver.monthly_km ?? 0) + km : driver.monthly_km,
      deliveries_count: Number(driver.deliveries_count ?? 0) + 1,
      driving_hours_month: isCurrentMonth
        ? Number(driver.driving_hours_month ?? 0) + hoursAdd
        : driver.driving_hours_month,
      updated_at: new Date().toISOString(),
    }).eq('id', sheet.driver_id);
  }

  const earnings = Number(sheet.driver_salary ?? sheet.revenue ?? 0);
  const fuel = Number(sheet.fuel_cost ?? 0);
  const tolls = Number(sheet.toll_cost ?? sheet.toll_cost_calc ?? 0);
  const netProfit = Number(sheet.net_profit ?? 0);
  const salary = Number(sheet.driver_salary ?? 0);

  const { data: stats } = await supabase
    .from('driver_stats')
    .select('driver_id, total_distance, total_deliveries, total_earnings, total_fuel, total_tolls, monthly_distance, monthly_deliveries, monthly_salary, monthly_net_profit')
    .eq('driver_id', sheet.driver_id)
    .maybeSingle();

  if (stats) {
    await supabase.from('driver_stats').update({
      total_distance: Number(stats.total_distance ?? 0) + km,
      total_deliveries: Number(stats.total_deliveries ?? 0) + 1,
      total_earnings: Number(stats.total_earnings ?? 0) + earnings,
      total_fuel: Number(stats.total_fuel ?? 0) + fuel,
      total_tolls: Number(stats.total_tolls ?? 0) + tolls,
      monthly_distance: isCurrentMonth ? Number(stats.monthly_distance ?? 0) + km : stats.monthly_distance,
      monthly_deliveries: isCurrentMonth ? Number(stats.monthly_deliveries ?? 0) + 1 : stats.monthly_deliveries,
      monthly_salary: isCurrentMonth ? Number(stats.monthly_salary ?? 0) + salary : stats.monthly_salary,
      monthly_net_profit: isCurrentMonth ? Number(stats.monthly_net_profit ?? 0) + netProfit : stats.monthly_net_profit,
      last_delivery_date: sheet.date ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }).eq('driver_id', sheet.driver_id);
  } else {
    await supabase.from('driver_stats').upsert({
      driver_id: sheet.driver_id,
      total_distance: km,
      total_deliveries: 1,
      total_earnings: earnings,
      total_fuel: fuel,
      total_tolls: tolls,
      monthly_distance: isCurrentMonth ? km : 0,
      monthly_deliveries: isCurrentMonth ? 1 : 0,
      monthly_salary: isCurrentMonth ? salary : 0,
      monthly_net_profit: isCurrentMonth ? netProfit : 0,
      last_delivery_date: sheet.date ?? new Date().toISOString().slice(0, 10),
    }, { onConflict: 'driver_id' });
  }

  if (sheet.truck_id) {
    const { data: truck } = await supabase
      .from('trucks')
      .select('id, mileage')
      .eq('id', sheet.truck_id)
      .maybeSingle();

    if (truck) {
      await supabase.from('trucks').update({
        mileage: Number(truck.mileage ?? 0) + km,
        updated_at: new Date().toISOString(),
      }).eq('id', sheet.truck_id);
    }
  }
}
