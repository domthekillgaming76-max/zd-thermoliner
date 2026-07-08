import { supabase } from '../lib/supabase';
import { normalizeRole, type AppRole } from '../lib/roleEngine';
import { resolveDisplayStatus } from './onlinePresenceService';
import type { NormalizedProfile } from './profileService';

/** Raw DB roles that map to normalized driver */
export const DRIVER_PROFILE_ROLES = ['chauffeur', 'driver', 'member', 'tractionnaire'] as const;

export type DriverProfileInput = Pick<
  NormalizedProfile,
  'id' | 'email' | 'full_name' | 'pseudo' | 'avatar_url' | 'truck_photo_url' | 'role'
>;

export function isDriverProfileRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return normalizeRole(role) === 'driver' || DRIVER_PROFILE_ROLES.includes(role as typeof DRIVER_PROFILE_ROLES[number]);
}

export function isVirtualDriverId(id: string): boolean {
  return id.startsWith('profile-');
}

async function fetchPresenceStatus(userId: string): Promise<'online' | 'offline'> {
  const { data } = await supabase
    .from('online_presence')
    .select('status, last_seen_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return 'offline';
  return resolveDisplayStatus({
    status: (data.status as 'online' | 'offline') ?? 'offline',
    last_seen_at: data.last_seen_at,
  });
}

/**
 * Creates or updates a drivers row from a profile — idempotent upsert on user_id.
 * Returns the driver id, or null if the profile is not a driver role.
 */
export async function ensureDriverProfile(profile: DriverProfileInput): Promise<string | null> {
  if (!isDriverProfileRole(profile.role)) return null;

  const { data, error } = await supabase.rpc('ensure_driver_profile', {
    p_profile_id: profile.id,
  });

  if (!error && data) {
    console.log('[Z&D DriverSync] driver ensured via RPC for', profile.email);
    return (data as string) ?? null;
  }

  if (error) {
    const missingFn = error.code === 'PGRST202' || error.code === '42883'
      || (error.message ?? '').toLowerCase().includes('ensure_driver_profile');
    if (!missingFn) {
      console.warn('[Z&D DriverSync] ensure_driver_profile RPC failed:', error.message);
    }
    const legacy = await supabase.rpc('ensure_driver_from_profile', { p_user_id: profile.id });
    if (!legacy.error && legacy.data) {
      console.log('[Z&D DriverSync] driver ensured via legacy RPC for', profile.email);
      return (legacy.data as string) ?? null;
    }
  }

  return directEnsureDriver(profile);
}

/** @deprecated Use ensureDriverProfile */
export const ensureDriverFromProfile = ensureDriverProfile;

async function directEnsureDriver(profile: DriverProfileInput): Promise<string | null> {
  const name = profile.pseudo?.trim() || profile.full_name?.trim() || profile.email || 'Chauffeur';
  const presenceStatus = await fetchPresenceStatus(profile.id);
  const now = new Date().toISOString();

  const payload = {
    user_id: profile.id,
    name,
    pseudo: profile.pseudo,
    email: profile.email,
    avatar_url: profile.avatar_url,
    photo_url: profile.truck_photo_url ?? profile.avatar_url,
    member_role: 'driver',
    role: 'chauffeur',
    status: 'active',
    presence_status: presenceStatus,
    is_active_driver: true,
    joined_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('drivers')
    .upsert(payload, { onConflict: 'user_id', ignoreDuplicates: false })
    .select('id')
    .single();

  if (error) {
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('drivers').update({
        name,
        pseudo: profile.pseudo,
        email: profile.email,
        avatar_url: profile.avatar_url,
        photo_url: profile.truck_photo_url ?? profile.avatar_url,
        member_role: 'driver',
        role: 'chauffeur',
        is_active_driver: true,
        presence_status: presenceStatus,
        updated_at: now,
      }).eq('id', existing.id);
      return existing.id as string;
    }

    console.error('[Z&D DriverSync] direct upsert failed:', error.message);
    return null;
  }

  console.log('[Z&D DriverSync] driver ensured via direct upsert for', profile.email);
  return (data?.id as string) ?? null;
}

export async function fetchDriverProfilesFromRoles(): Promise<
  Array<{ id: string; email: string; full_name: string; pseudo: string | null; avatar_url: string | null; truck_photo_url: string | null; role: string }>
> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, pseudo, avatar_url, truck_photo_url, role')
    .in('role', [...DRIVER_PROFILE_ROLES]);

  if (error) {
    console.warn('[Z&D DriverSync] fetchDriverProfilesFromRoles:', error.message);
    return [];
  }
  return data ?? [];
}

export function profileRoleToAppRole(role: string): AppRole {
  return normalizeRole(role);
}
