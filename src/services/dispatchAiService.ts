import { supabase } from '../lib/supabase';
import { haversineKm, resolveCityCoords } from '../lib/trackingMapCoords';
import type { DispatchAiSuggestion, DriverScore } from '../lib/dispatchAiTypes';
import type { TransportMission } from '../lib/dispatchTypes';

interface DriverCandidate {
  id: string;
  name: string;
  status: string;
  total_km: number;
  deliveries_count: number;
  member_role: string | null;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  active_missions: number;
}

async function fetchDriverCandidates(): Promise<DriverCandidate[]> {
  const [driversRes, missionsRes, presenceRes] = await Promise.all([
    supabase.from('drivers').select('id, name, status, total_km, deliveries_count, member_role').eq('status', 'active'),
    supabase.from('transport_missions').select('driver_id, status').in('status', ['assigned', 'in_progress']),
    supabase.from('driver_presence').select('driver_id, current_city, current_lat, current_lng, status'),
  ]);

  const missions = missionsRes.data ?? [];
  const presenceMap = new Map((presenceRes.data ?? []).map(p => [p.driver_id as string, p]));

  return (driversRes.data ?? []).map(d => {
    const pres = presenceMap.get(d.id as string);
    const activeMissions = missions.filter(m => m.driver_id === d.id).length;
    return {
      id: d.id as string,
      name: d.name as string,
      status: d.status as string,
      total_km: Number(d.total_km ?? 0),
      deliveries_count: Number(d.deliveries_count ?? 0),
      member_role: (d.member_role as string) ?? null,
      current_city: (pres?.current_city as string) ?? null,
      current_lat: pres?.current_lat != null ? Number(pres.current_lat) : null,
      current_lng: pres?.current_lng != null ? Number(pres.current_lng) : null,
      active_missions: activeMissions,
    };
  });
}

function scoreDriverForMission(driver: DriverCandidate, mission: TransportMission): DriverScore {
  const reasons: string[] = [];
  let availability = 100;
  let distanceScore = 50;
  let performanceScore = 50;
  let activityScore = 50;

  if (driver.active_missions > 0) {
    availability = Math.max(0, 100 - driver.active_missions * 40);
    reasons.push(driver.active_missions > 1 ? 'Plusieurs missions actives' : '1 mission en cours');
  } else {
    reasons.push('Disponible');
  }

  const pickup = resolveCityCoords(mission.departure_city);
  if (pickup && driver.current_lat != null && driver.current_lng != null) {
    const km = haversineKm(driver.current_lat, driver.current_lng, pickup.lat, pickup.lng);
    distanceScore = Math.max(0, Math.min(100, 100 - km * 2));
    reasons.push(`~${Math.round(km)} km du chargement`);
  } else if (driver.current_city?.toLowerCase() === mission.departure_city.toLowerCase()) {
    distanceScore = 95;
    reasons.push('Même ville de départ');
  } else {
    reasons.push('Position estimée');
  }

  const deliveryScore = Math.min(100, (driver.deliveries_count ?? 0) * 3);
  const kmScore = Math.min(100, (driver.total_km ?? 0) / 500);
  performanceScore = Math.round((deliveryScore + kmScore) / 2);
  if (driver.deliveries_count > 20) reasons.push(`${driver.deliveries_count} livraisons`);

  if (driver.status === 'active') activityScore += 20;
  if (['chauffeur', 'tractionnaire'].includes(driver.member_role ?? '')) activityScore += 15;

  const score = Math.round(
    availability * 0.35 +
    distanceScore * 0.25 +
    performanceScore * 0.25 +
    activityScore * 0.15,
  );

  return {
    driverId: driver.id,
    driverName: driver.name,
    score,
    availability,
    distanceScore,
    performanceScore,
    activityScore,
    currentCity: driver.current_city,
    reasons,
  };
}

export async function suggestDriverForMission(mission: TransportMission): Promise<DispatchAiSuggestion> {
  const candidates = await fetchDriverCandidates();
  const rankings = candidates
    .map(d => scoreDriverForMission(d, mission))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const best = rankings[0] ?? null;

  return {
    missionId: mission.id,
    missionReference: mission.reference ?? mission.id.slice(0, 8),
    pickupCity: mission.departure_city,
    rankings,
    suggestedDriverId: best?.driverId ?? null,
    suggestedDriverName: best?.driverName ?? null,
  };
}
