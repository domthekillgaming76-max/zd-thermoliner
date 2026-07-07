import { canManageDrivers } from './driverPermissions';

export function canManageFleet(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageDrivers(profileRole, email);
}
