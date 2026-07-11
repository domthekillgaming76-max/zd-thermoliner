import { supabase } from '../lib/supabase';
import { invokeAuthenticatedRpc, getFreshAccessToken } from '../lib/supabaseSession';
import { assertCanAssignRole, assertCanModifyUser } from '../lib/dom76Protection';
import { toAssignableRole } from '../lib/accessPolicy';
import { ensureDriverProfile, deactivateDriverProfile, isDriverProfileRole, shouldEnsureDriverProfile } from './driverSyncService';
import { createUserNotification } from './notificationService';
import type {
  AdminAction,
  AdminUser,
  PermissionKey,
  UserPermission,
} from '../lib/adminTypes';

const USER_BASE_COLUMNS =
  'id, email, full_name, pseudo, avatar_url, role, application_status, is_active, created_at, updated_at, last_seen_at';

const USER_FULL_COLUMNS = `${USER_BASE_COLUMNS}, is_suspended`;

/** Rôles stockés en base si le rôle canonique n'est pas encore accepté par la contrainte SQL */
const ROLE_DB_VARIANTS: Record<string, string[]> = {
  visiteur: ['visiteur', 'visitor', 'candidat'],
  chauffeur: ['chauffeur', 'driver', 'member', 'flotte'],
  admin: ['admin', 'patron', 'pdg'],
};

function toServiceError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message: unknown }).message);
    if (message) return new Error(message);
  }
  return new Error(typeof err === 'string' ? err : 'Erreur inconnue');
}

function isRoleConstraintError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('profiles_role_check')
    || m.includes('check constraint')
    || m.includes('violates check');
}

async function persistRoleChange(targetUserId: string, role: string): Promise<void> {
  const canonicalRole = toAssignableRole(role);
  const variants = ROLE_DB_VARIANTS[canonicalRole] ?? [canonicalRole];

  try {
    await invokeAuthenticatedRpc('admin_change_user_role', {
      p_target_user_id: targetUserId,
      p_new_role: canonicalRole,
    });
    return;
  } catch (err) {
    const message = toServiceError(err).message;

    await getFreshAccessToken();

    let lastError: Error | null = toServiceError(err);
    for (const dbRole of variants) {
      const { data, error: directError } = await supabase
        .from('profiles')
        .update({
          role: dbRole,
          updated_at: new Date().toISOString(),
          ...(canonicalRole === 'chauffeur' || canonicalRole === 'admin'
            ? { application_status: 'approved', is_active: true, is_suspended: false }
            : {}),
        })
        .eq('id', targetUserId)
        .select('id, role')
        .single();
      if (!directError && data?.role) return;
      if (directError) {
        lastError = toServiceError(directError);
        if (!isRoleConstraintError(lastError.message) && !message.toLowerCase().includes('could not find')) {
          break;
        }
      }
    }

    throw lastError ?? new Error('Impossible de modifier le rôle en base de données.');
  }
}

function isAdminSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

function logAdminSchemaWarning(context: string, error: { message?: string }) {
  console.warn(
    `[Z&D] Admin schema issue (${context}) — apply migration 031_admin_security.sql`,
    error.message,
  );
}

function normalizeUser(row: Record<string, unknown>): AdminUser {
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: (row.full_name as string) ?? '',
    pseudo: (row.pseudo as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    role: row.role as string,
    application_status: (row.application_status as string) ?? null,
    is_active: row.is_active !== false,
    is_suspended: Boolean(row.is_suspended),
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? null,
    last_seen_at: (row.last_seen_at as string) ?? null,
  };
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const columnSets = [
    USER_FULL_COLUMNS,
    USER_BASE_COLUMNS,
    'id, email, full_name, pseudo, avatar_url, role, application_status, created_at',
    'id, email, full_name, pseudo, role, created_at',
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const columns of columnSets) {
    const { data, error } = await supabase
      .from('profiles')
      .select(columns)
      .order('created_at', { ascending: false });

    if (!error) {
      return (data ?? []).map(r => normalizeUser(r as unknown as Record<string, unknown>));
    }
    lastError = error;
    if (error.code !== 'PGRST204') break;
  }

  if (lastError) {
    if (isAdminSchemaError(lastError)) {
      logAdminSchemaWarning('profiles', lastError);
      return [];
    }
    throw lastError;
  }

  return [];
}

export async function fetchUserPermissions(userId: string): Promise<UserPermission[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []) as UserPermission[];
}

export async function fetchAdminActions(limit = 30): Promise<AdminAction[]> {
  const { data, error } = await supabase
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id as string,
    admin_id: (r.admin_id as string) ?? null,
    target_user_id: (r.target_user_id as string) ?? null,
    action_type: r.action_type as AdminAction['action_type'],
    details: (r.details as Record<string, unknown>) ?? {},
    created_at: r.created_at as string,
  }));
}

export async function fetchAdminModuleBundle() {
  const { error: adminTablesProbe } = await supabase.from('admin_actions').select('id').limit(1);
  const migrationRequired = !!adminTablesProbe && isAdminSchemaError(adminTablesProbe);

  const users = await fetchAllUsers();

  const [applications, roadSheets, securityLogs, adminActions, accessAttempts] = await Promise.all([
    supabase.from('recruitment_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('road_sheets').select('id', { count: 'exact', head: true }).eq('validated', false),
    supabase.from('security_logs').select('id', { count: 'exact', head: true }).eq('event_type', 'failed_access_attempt').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    fetchAdminActions(20),
    supabase.from('access_attempts').select('*').eq('allowed', false).order('created_at', { ascending: false }).limit(10),
  ]);

  if (securityLogs.error && isAdminSchemaError(securityLogs.error)) {
    logAdminSchemaWarning('security_logs', securityLogs.error);
  }
  if (accessAttempts.error && isAdminSchemaError(accessAttempts.error)) {
    logAdminSchemaWarning('access_attempts', accessAttempts.error);
  }

  return {
    users,
    pendingApplications: applications.error ? 0 : (applications.count ?? 0),
    pendingRoadSheets: roadSheets.error ? 0 : (roadSheets.count ?? 0),
    securityAlerts: securityLogs.error ? 0 : (securityLogs.count ?? 0),
    adminActions,
    failedAttempts: accessAttempts.error ? [] : (accessAttempts.data ?? []),
    migrationRequired,
  };
}

export async function notifyRoleChanged(targetUserId: string): Promise<void> {
  await createUserNotification(
    targetUserId,
    'Votre rôle a été mis à jour.',
    'Votre rôle a été mis à jour.',
    'info',
  );
}

export interface RoleChangeResult {
  driverEnsured: boolean;
  driverId: string | null;
}

export async function changeUserRole(
  targetUserId: string,
  newRole: string,
  targetEmail: string,
): Promise<RoleChangeResult> {
  const canonicalRole = toAssignableRole(newRole);
  assertCanAssignRole(targetEmail, canonicalRole);
  try {
    await persistRoleChange(targetUserId, canonicalRole);
    await notifyRoleChanged(targetUserId);
  } catch (err) {
    throw toServiceError(err);
  }

  let driverId: string | null = null;
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, email, full_name, pseudo, avatar_url, truck_photo_url, role')
    .eq('id', targetUserId)
    .maybeSingle();

  if (profileRow && shouldEnsureDriverProfile(profileRow)) {
    driverId = await ensureDriverProfile(profileRow);
  } else if (canonicalRole === 'visiteur') {
    await deactivateDriverProfile(targetUserId);
  }

  return {
    driverEnsured: Boolean(driverId) || isDriverProfileRole(newRole),
    driverId,
  };
}

export async function suspendUser(targetUserId: string, targetEmail: string, reason?: string): Promise<void> {
  assertCanModifyUser(targetEmail, 'suspend');
  await invokeAuthenticatedRpc('admin_suspend_user', {
    p_target_user_id: targetUserId,
    p_reason: reason ?? null,
  });
}

export async function reactivateUser(targetUserId: string): Promise<void> {
  await invokeAuthenticatedRpc('admin_reactivate_user', {
    p_target_user_id: targetUserId,
  });
}

export async function resetUserTheme(targetUserId: string, targetEmail: string): Promise<void> {
  assertCanModifyUser(targetEmail, 'reset_theme');
  await invokeAuthenticatedRpc('admin_reset_profile_theme', {
    p_target_user_id: targetUserId,
  });
}

export async function deleteUserProfile(targetUserId: string, targetEmail: string, reason?: string): Promise<void> {
  assertCanModifyUser(targetEmail, 'delete');
  await invokeAuthenticatedRpc('admin_delete_user_profile', {
    p_target_user_id: targetUserId,
    p_reason: reason ?? null,
  });
}

export async function upsertUserPermission(
  userId: string,
  permissionKey: PermissionKey,
  granted: boolean,
  grantedBy: string,
  targetEmail: string,
): Promise<void> {
  assertCanModifyUser(targetEmail, 'remove_permissions');
  const { error } = await supabase.from('user_permissions').upsert(
    {
      user_id: userId,
      permission_key: permissionKey,
      granted,
      granted_by: grantedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,permission_key' },
  );
  if (error) throw error;

  await supabase.from('admin_actions').insert({
    admin_id: grantedBy,
    target_user_id: userId,
    action_type: granted ? 'permission_grant' : 'permission_revoke',
    details: { permission_key: permissionKey },
  });
}

export async function fetchUserActivity(userId: string) {
  const [security, adminActs] = await Promise.all([
    supabase.from('security_logs').select('*').or(`user_id.eq.${userId},actor_id.eq.${userId}`).order('created_at', { ascending: false }).limit(30),
    supabase.from('admin_actions').select('*').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(20),
  ]);
  return {
    securityLogs: security.data ?? [],
    adminActions: adminActs.data ?? [],
  };
}
