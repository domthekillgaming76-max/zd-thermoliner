import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ProfileCustomizationForm } from '../lib/profileThemes';

export function toProfileError(err: unknown, fallback = 'Impossible d\'enregistrer le profil.'): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message?: string }).message ?? '').trim();
    if (msg) return new Error(msg);
  }
  return new Error(fallback);
}

export const PROFILE_BASE_COLUMNS =
  'id, email, full_name, pseudo, avatar_url, theme_color, truck_photo_url, role, created_at, updated_at';

export const PROFILE_OPTIONAL_COLUMNS = 'last_seen_at';

export const PROFILE_ADMIN_COLUMNS = 'is_active, is_suspended';

export const PROFILE_CUSTOMIZATION_COLUMNS =
  'bio, country, discord_name, truckersmp_id, favorite_truck, favorite_trailer, profile_theme, primary_color, secondary_color, background_style, card_style, banner_url';

export const PROFILE_EXTENDED_SELECT = `${PROFILE_BASE_COLUMNS}, ${PROFILE_OPTIONAL_COLUMNS}, ${PROFILE_CUSTOMIZATION_COLUMNS}`;

export const PROFILE_BASE_UPDATE_FIELDS = [
  'full_name',
  'pseudo',
  'avatar_url',
  'theme_color',
  'truck_photo_url',
  'updated_at',
] as const;

export const PROFILE_CUSTOMIZATION_UPDATE_FIELDS = [
  'bio',
  'country',
  'discord_name',
  'truckersmp_id',
  'favorite_truck',
  'favorite_trailer',
  'profile_theme',
  'primary_color',
  'secondary_color',
  'background_style',
  'card_style',
  'banner_url',
] as const;

export interface NormalizedProfile {
  id: string;
  email: string;
  full_name: string;
  pseudo: string | null;
  avatar_url: string | null;
  theme_color: string;
  truck_photo_url: string | null;
  role: string;
  bio: string | null;
  country: string | null;
  discord_name: string | null;
  truckersmp_id: string | null;
  favorite_truck: string | null;
  favorite_trailer: string | null;
  profile_theme: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_style: string | null;
  card_style: string | null;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  application_status?: string | null;
  is_active?: boolean;
  is_suspended?: boolean;
}

export interface ProfileFetchResult {
  profile: NormalizedProfile | null;
  error: string | null;
  customizationAvailable: boolean;
}

const PROTECTED_FIELDS = new Set(['id', 'email', 'role', 'created_at']);

type ProfileMatch = { column: 'id' | 'email'; value: string };

function logProfileError(
  action: 'fetch' | 'update',
  userId: string,
  error: PostgrestError,
  extra?: Record<string, unknown>,
) {
  console.error(`[Z&D] Profile ${action} failed`, {
    userId,
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    ...extra,
  });
}

export function isProfileSchemaError(error: PostgrestError | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find')))
  );
}

function isNoRowUpdated(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST116' || (error.message ?? '').toLowerCase().includes('0 rows');
}

export function filterPayloadByAvailableColumns(
  payload: Record<string, unknown>,
  customizationAvailable: boolean,
): Record<string, unknown> {
  const allowed = new Set<string>(PROFILE_BASE_UPDATE_FIELDS);
  if (customizationAvailable) {
    for (const field of PROFILE_CUSTOMIZATION_UPDATE_FIELDS) allowed.add(field);
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key)) filtered[key] = value;
  }
  return filtered;
}

export function normalizeProfileRow(data: Record<string, unknown> | null): NormalizedProfile | null {
  if (!data) return null;

  return {
    id: String(data.id),
    email: String(data.email ?? ''),
    full_name: String(data.full_name ?? ''),
    pseudo: (data.pseudo as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    theme_color: (data.theme_color as string) ?? '#ef4444',
    truck_photo_url: (data.truck_photo_url as string | null) ?? null,
    role: (data.role as string) ?? 'chauffeur',
    bio: (data.bio as string | null) ?? null,
    country: (data.country as string | null) ?? null,
    discord_name: (data.discord_name as string | null) ?? null,
    truckersmp_id: (data.truckersmp_id as string | null) ?? null,
    favorite_truck: (data.favorite_truck as string | null) ?? null,
    favorite_trailer: (data.favorite_trailer as string | null) ?? null,
    profile_theme: (data.profile_theme as string | null) ?? 'scania_red',
    primary_color: (data.primary_color as string | null) ?? null,
    secondary_color: (data.secondary_color as string | null) ?? null,
    background_style: (data.background_style as string | null) ?? 'dark',
    card_style: (data.card_style as string | null) ?? 'glass',
    banner_url: (data.banner_url as string | null) ?? null,
    created_at: String(data.created_at ?? new Date().toISOString()),
    updated_at: String(data.updated_at ?? new Date().toISOString()),
    last_seen_at: (data.last_seen_at as string | null) ?? null,
    application_status: (data.application_status as string | null) ?? null,
    is_active: data.is_active !== false,
    is_suspended: Boolean(data.is_suspended),
  };
}

export async function probeProfileCustomization(): Promise<boolean> {
  const { error } = await supabase.from('profiles').select('bio, profile_theme, banner_url').limit(1);
  return !error || !isProfileSchemaError(error);
}

async function fetchProfileAdminFlags(userId: string): Promise<Pick<NormalizedProfile, 'is_active' | 'is_suspended'>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_ADMIN_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) {
    return { is_active: true, is_suspended: false };
  }
  return {
    is_active: (data as { is_active?: boolean }).is_active !== false,
    is_suspended: Boolean((data as { is_suspended?: boolean }).is_suspended),
  };
}

export async function fetchUserProfile(userId: string): Promise<ProfileFetchResult> {
  const customizationAvailable = await probeProfileCustomization();

  const selectColumns = customizationAvailable ? PROFILE_EXTENDED_SELECT : PROFILE_BASE_COLUMNS;

  const { data, error } = await supabase
    .from('profiles')
    .select(selectColumns)
    .eq('id', userId)
    .maybeSingle();

  if (error && customizationAvailable && isProfileSchemaError(error)) {
    console.warn(
      '[Z&D] Profile customization fetch failed — falling back to base columns.',
      { message: error.message, code: error.code },
    );
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_BASE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (fallback.error) {
      logProfileError('fetch', userId, fallback.error);
      return { profile: null, error: fallback.error.message, customizationAvailable: false };
    }
    if (!fallback.data) {
      return { profile: null, error: 'Aucune ligne profil trouvée pour cet utilisateur.', customizationAvailable: false };
    }
    const adminFlags = await fetchProfileAdminFlags(userId);
    return {
      profile: { ...normalizeProfileRow(fallback.data as Record<string, unknown>)!, ...adminFlags },
      error: null,
      customizationAvailable: false,
    };
  }

  if (error) {
    logProfileError('fetch', userId, error);
    return { profile: null, error: error.message, customizationAvailable: false };
  }

  if (!data) {
    const message = 'Aucune ligne profil trouvée pour cet utilisateur.';
    console.error('[Z&D] Profile fetch returned no row', { userId });
    return { profile: null, error: message, customizationAvailable };
  }

  const adminFlags = await fetchProfileAdminFlags(userId);
  const profile = normalizeProfileRow(data as unknown as Record<string, unknown>);

  return {
    profile: profile ? { ...profile, ...adminFlags } : null,
    error: null,
    customizationAvailable,
  };
}

export function sanitizeProfilePayload(form: ProfileCustomizationForm): Record<string, unknown> {
  return {
    full_name: form.full_name.trim(),
    pseudo: form.pseudo.trim() || null,
    bio: form.bio.trim() || null,
    country: form.country.trim() || null,
    discord_name: form.discord_name.trim() || null,
    truckersmp_id: form.truckersmp_id.trim() || null,
    favorite_truck: form.favorite_truck.trim() || null,
    favorite_trailer: form.favorite_trailer.trim() || null,
    avatar_url: form.avatar_url.trim() || null,
    banner_url: form.banner_url.trim() || null,
    truck_photo_url: form.truck_photo_url.trim() || null,
    profile_theme: form.profile_theme,
    primary_color: form.primary_color,
    secondary_color: form.secondary_color,
    background_style: form.background_style,
    card_style: form.card_style,
    theme_color: form.primary_color,
    updated_at: new Date().toISOString(),
  };
}

async function runProfileUpdate(
  payload: Record<string, unknown>,
  match: ProfileMatch,
  selectColumns: string,
): Promise<{ data: Record<string, unknown> | null; error: PostgrestError | null; status: number; statusText: string }> {
  const response = await supabase
    .from('profiles')
    .update(payload)
    .eq(match.column, match.value)
    .select(selectColumns)
    .maybeSingle();

  console.log('[Z&D] Profile update response', {
    match,
    payload,
    data: response.data,
    error: response.error,
    status: response.status,
    statusText: response.statusText,
    count: response.count,
  });

  return {
    data: response.data as Record<string, unknown> | null,
    error: response.error,
    status: response.status,
    statusText: response.statusText,
  };
}

async function updateProfileRow(
  payload: Record<string, unknown>,
  userId: string,
  email: string,
  selectColumns: string,
): Promise<NormalizedProfile> {
  let result = await runProfileUpdate(payload, { column: 'id', value: userId }, selectColumns);

  const needsEmailFallback =
    !result.data && (!result.error || isNoRowUpdated(result.error));

  if (needsEmailFallback && email) {
    console.warn('[Z&D] Profile save: no row updated by id — trying email fallback', {
      userId,
      email,
      error: result.error,
    });
    result = await runProfileUpdate(payload, { column: 'email', value: email }, selectColumns);
  }

  if (result.error && !isNoRowUpdated(result.error)) {
    if (isProfileSchemaError(result.error)) {
      throw toProfileError(result.error);
    }
    logProfileError('update', userId, result.error, { payload, match: 'id/email' });
    throw toProfileError(result.error);
  }

  if (!result.data) {
    throw new Error('Aucune ligne profil mise à jour. Vérifiez vos droits ou contactez un administrateur.');
  }

  const normalized = normalizeProfileRow(result.data);
  if (!normalized) {
    throw new Error('Réponse profil invalide après enregistrement.');
  }
  return normalized;
}

export async function saveUserProfile(
  userId: string,
  email: string,
  form: ProfileCustomizationForm,
  customizationAvailable: boolean,
): Promise<NormalizedProfile> {
  const rawPayload = sanitizeProfilePayload(form);
  for (const key of PROTECTED_FIELDS) {
    delete rawPayload[key];
  }

  let payload = filterPayloadByAvailableColumns(rawPayload, customizationAvailable);
  const selectColumns = customizationAvailable ? PROFILE_EXTENDED_SELECT : PROFILE_BASE_COLUMNS;

  console.log('[Z&D] Profile save payload', {
    userId,
    email,
    customizationAvailable,
    payload,
    fields: Object.keys(payload),
  });

  try {
    return await updateProfileRow(payload, userId, email, selectColumns);
  } catch (err) {
    const pgError = err as PostgrestError;
    if (!isProfileSchemaError(pgError)) {
      throw toProfileError(err);
    }

    console.warn(
      '[Z&D] Profile save: customization columns missing — retrying with base fields only.',
      { message: pgError.message, code: pgError.code },
    );

    payload = filterPayloadByAvailableColumns(rawPayload, false);
    try {
      return await updateProfileRow(payload, userId, email, PROFILE_BASE_COLUMNS);
    } catch (retryErr) {
      throw toProfileError(retryErr);
    }
  }
}

/** @deprecated Use fetchUserProfile */
export async function fetchProfileById(userId: string) {
  const result = await fetchUserProfile(userId);
  if (result.error) throw new Error(result.error);
  return result.profile;
}
