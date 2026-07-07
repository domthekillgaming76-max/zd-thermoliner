import type { DriverProfile } from './driverTypes';
import { getMemberRoleLabel, getPresenceLabel } from './driverTypes';

export type DriverFilterKey =
  | 'all'
  | 'online'
  | 'offline'
  | 'driving'
  | 'vacation'
  | 'administrator'
  | 'driver'
  | 'recruitment';

export const DRIVER_FILTERS: { key: DriverFilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'online', label: 'En ligne' },
  { key: 'offline', label: 'Hors ligne' },
  { key: 'driving', label: 'En route' },
  { key: 'vacation', label: 'Vacances' },
  { key: 'driver', label: 'Chauffeurs' },
  { key: 'recruitment', label: 'Recrutement' },
  { key: 'administrator', label: 'Administrateurs' },
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
      case 'driver':
        return ['chauffeur', 'driver'].includes(d.member_role ?? '') || d.role === 'chauffeur';
      case 'recruitment':
        return ['candidat', 'recruitment', 'visitor', 'visiteur'].includes(d.member_role ?? '');
      case 'administrator':
        return ['patron', 'pdg', 'admin', 'directeur', 'manager'].includes(d.member_role ?? '') ||
          ['patron', 'pdg', 'admin', 'directeur'].includes(d.role ?? '');
      default:
        return true;
    }
  });
}
