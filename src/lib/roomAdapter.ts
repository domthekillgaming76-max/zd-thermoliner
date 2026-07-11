import type { AppModuleRecord } from '../services/appModuleService';
import type { RoomPermission } from './roomTypes';

export function roomToAppModule(room: RoomPermission): AppModuleRecord {
  const roles = room.visible_to_roles ?? [];
  return {
    id: room.id,
    key: room.room_key,
    label: room.room_name,
    category: room.category,
    icon: room.icon,
    route: room.route,
    enabled: room.enabled,
    sort_order: room.sort_order,
    allowed_roles: roles,
    admin_only: room.admin_critical || (!roles.includes('visiteur') && !roles.includes('chauffeur')),
    created_at: room.created_at,
    updated_at: room.updated_at,
  };
}

export function roomsToAppModules(rooms: RoomPermission[]): AppModuleRecord[] {
  return rooms.map(roomToAppModule);
}
