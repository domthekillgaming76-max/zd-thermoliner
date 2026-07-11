import type { RoomPermission } from './roomTypes';
import { canAccessSalon, canAccessPath } from './accessService';

export function canAccessConfiguredModule(
  role: string | null | undefined,
  email: string | null | undefined,
  moduleKey: string,
  rooms: RoomPermission[],
): boolean {
  return canAccessSalon({
    role,
    email,
    moduleOrPage: moduleKey,
    rooms,
  });
}

export function isModuleEnabled(moduleKey: string, rooms: RoomPermission[]): boolean {
  const room = rooms.find(r => r.room_key === moduleKey);
  if (!room) return true;
  return room.enabled;
}

export function isRouteEnabled(pathname: string, rooms: RoomPermission[]): boolean {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const room = rooms.find(r => {
    const route = r.route.replace(/\/$/, '') || '/';
    return path === route || path.startsWith(`${route}/`);
  });
  if (!room) return true;
  return room.enabled;
}

export { canAccessPath };
