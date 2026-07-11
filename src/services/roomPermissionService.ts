import { supabase } from '../lib/supabase';
import { getFreshAccessToken } from '../lib/supabaseSession';
import { DEFAULT_ROOM_PERMISSIONS } from '../lib/defaultRoomPermissions';
import type { RoomPermission, RoomPermissionPatch } from '../lib/roomTypes';
import { ADMIN_CRITICAL_ROOMS } from '../lib/accessPolicy';
import type { AppRole } from '../lib/roleEngine';

function rowToRoom(row: Record<string, unknown>): RoomPermission {
  return {
    id: row.id as string,
    room_key: row.room_key as string,
    room_name: row.room_name as string,
    description: (row.description as string) ?? null,
    category: row.category as string,
    icon: (row.icon as string) ?? 'HelpCircle',
    color: (row.color as string) ?? '#64748b',
    route: row.route as string,
    sort_order: Number(row.sort_order ?? 0),
    enabled: row.enabled !== false,
    visible_to_roles: Array.isArray(row.visible_to_roles) ? (row.visible_to_roles as string[]) : ['admin'],
    admin_critical: Boolean(row.admin_critical),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function fallbackRooms(): RoomPermission[] {
  const now = new Date().toISOString();
  return DEFAULT_ROOM_PERMISSIONS.map((r, i) => ({
    ...r,
    id: `default-${r.room_key}`,
    sort_order: r.sort_order ?? i * 10,
    created_at: now,
    updated_at: now,
  }));
}

export async function fetchRoomPermissions(): Promise<RoomPermission[]> {
  const { data, error } = await supabase
    .from('room_permissions')
    .select('*')
    .order('category')
    .order('sort_order');

  if (error) {
    console.warn('[Z&D Rooms] fetch failed, using defaults:', error.message);
    return fallbackRooms();
  }
  if (!data?.length) return fallbackRooms();
  return data.map(row => rowToRoom(row as Record<string, unknown>));
}

export async function updateRoomPermission(id: string, patch: RoomPermissionPatch): Promise<RoomPermission> {
  await getFreshAccessToken();

  if (patch.visible_to_roles) {
    const { data: current } = await supabase.from('room_permissions').select('room_key, admin_critical').eq('id', id).maybeSingle();
    const key = current?.room_key as string | undefined;
    const critical = current?.admin_critical || (key && ADMIN_CRITICAL_ROOMS.includes(key as typeof ADMIN_CRITICAL_ROOMS[number]));
    if (critical && !patch.visible_to_roles.includes('admin')) {
      patch.visible_to_roles = [...new Set([...patch.visible_to_roles, 'admin'])];
    }
  }

  const { data, error } = await supabase
    .from('room_permissions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToRoom(data as Record<string, unknown>);
}

export async function batchUpdateRoomOrder(
  updates: Array<{ id: string; sort_order: number; category?: string }>,
): Promise<void> {
  await getFreshAccessToken();
  for (const u of updates) {
    const { error } = await supabase
      .from('room_permissions')
      .update({
        sort_order: u.sort_order,
        ...(u.category ? { category: u.category } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', u.id);
    if (error) throw error;
  }
}

export function toggleRoomRole(
  roles: string[],
  role: AppRole,
  enabled: boolean,
): string[] {
  const set = new Set(roles.map(r => r.toLowerCase()));
  if (enabled) set.add(role);
  else set.delete(role);
  return Array.from(set);
}
