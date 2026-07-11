import type { DriverProfile } from './driverTypes';
import { getMemberRoleLabel, getPresenceLabel } from './driverTypes';
import { normalizeRole } from './roleEngine';

export type DriverFilterKey =
  | 'all'
  | 'online'
  | 'offline'
  | 'driving'
  | 'vacation'
  | 'admin'
  | 'chauffeur'
  | 'visiteur';

export const DRIVER_FILTERS: { key: DriverFilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'online', label: 'En ligne' },
  { key: 'offline', label: 'Hors ligne' },
  { key: 'driving', label: 'En route' },
  { key: 'vacation', label: 'Vacances' },
  { key: 'chauffeur', label: 'Chauffeurs' },
  { key: 'visiteur', label: 'Visiteurs' },
  { key: 'admin', label: 'Administrateurs' },
];

export function filterDrivers(
  drivers: DriverProfile[],
  query: string,
  filter: DriverFilterKey,
  truckMap: Map<string, string>,
): DriverProfile[] {
  const q = query.trim().toLowerCase();

  return drivers.filter(d => {
    const truckLabel = d.truck_id ? (truckMap.get(d.truck_id) ?? '') : '';
    const matchesSearch = !q || [
      d.name,
      d.pseudo,
      d.phone,
      d.email,
      d.country,
      d.member_role,
      d.role,
      truckLabel,
      getMemberRoleLabel(d.member_role),
      getPresenceLabel(d.presence_status),
    ].some(v => v?.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    switch (filter) {
      case 'online':
        return d.presence_status === 'online';
      case 'offline':
        return d.presence_status === 'offline' || !d.presence_status;
      case 'driving':
        return d.presence_status === 'driving' || d.driving_status === 'driving';
      case 'vacation':
        return d.presence_status === 'vacation' || d.driving_status === 'vacation';
      case 'chauffeur':
        return normalizeRole(d.role ?? d.member_role) === 'chauffeur';
      case 'visiteur':
        return normalizeRole(d.role ?? d.member_role) === 'visiteur';
      case 'admin':
        return normalizeRole(d.role ?? d.member_role) === 'admin';
      default:
        return true;
    }
  });
}
