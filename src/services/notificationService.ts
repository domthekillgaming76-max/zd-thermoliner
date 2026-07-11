import { supabase } from '../lib/supabase';
import {
  APP_UPDATE_NOTIFICATION_MESSAGE,
  APP_VERSION,
  buildUpdateTitle,
  checkForNewVersion,
  compareVersions,
  normalizeVersion,
} from '../lib/appVersion';
import type { LiveNotification } from '../lib/liveOpsTypes';

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'freight'
  | 'road_sheet'
  | 'salary'
  | 'announcement'
  | 'app_update'
  | 'wall_post'
  | 'wall_comment'
  | 'wall_reaction'
  | 'wall_announcement'
  | 'wall_convoy'
  | 'hr'
  | 'bank'
  | 'integration';

import { PERF } from '../lib/perfConfig';

export const NOTIFICATION_POLL_MS = PERF.notificationPollMs;

export async function fetchUserNotifications(userId: string, limit = 50): Promise<LiveNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, read, type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as LiveNotification[];
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function createUserNotification(
  userId: string,
  title: string,
  message?: string,
  type: NotificationType = 'info',
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_user_notification', {
    p_user_id: userId,
    p_title: title,
    p_message: message ?? null,
    p_type: type,
  });
  if (error) {
    const { data: direct } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message: message ?? null,
      type,
    }).select('id').single();
    return (direct?.id as string) ?? null;
  }
  return data as string | null;
}

export async function notifyUsersByRoles(
  roles: string[],
  title: string,
  message?: string,
  type: NotificationType = 'info',
): Promise<number> {
  const { data, error } = await supabase.rpc('notify_users_by_roles', {
    p_roles: roles,
    p_title: title,
    p_message: message ?? null,
    p_type: type,
  });
  if (error) return 0;
  return Number(data ?? 0);
}

/** Ensure the current user has an in-app notification for a pending app update. */
export async function ensureAppUpdateNotification(
  userId: string,
  targetVersion?: string | null,
): Promise<void> {
  const version = normalizeVersion(targetVersion ?? APP_VERSION);
  const running = normalizeVersion(APP_VERSION);
  if (compareVersions(version, running) <= 0 && !checkForNewVersion().hasUpdate) return;

  const title = buildUpdateTitle(version);

  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'app_update')
    .eq('title', title)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (data?.length) return;

  await createUserNotification(
    userId,
    title,
    APP_UPDATE_NOTIFICATION_MESSAGE,
    'app_update',
  );
}

export async function notifyFreightOffer(title: string, message: string): Promise<void> {
  await notifyUsersByRoles(
    ['admin', 'chauffeur'],
    title,
    message,
    'freight',
  );
}

export async function notifyRoadSheetValidated(driverUserId: string | null, route: string): Promise<void> {
  if (driverUserId) {
    await createUserNotification(driverUserId, 'Feuille de route validée', route, 'road_sheet');
  }
  await notifyUsersByRoles(['admin', 'chauffeur'], 'Feuille validée', route, 'road_sheet');
}

export async function notifyRoadSheetRejected(driverUserId: string | null, route: string): Promise<void> {
  if (driverUserId) {
    await createUserNotification(driverUserId, 'Feuille de route refusée', route, 'warning');
  }
}

export async function notifySalaryPaid(driverUserId: string | null, amount: string): Promise<void> {
  if (driverUserId) {
    await createUserNotification(
      driverUserId,
      'Salaire payé',
      `Votre salaire de ${amount} a été versé par la banque Z&D Thermoliner.`,
      'salary',
    );
  }
}

export async function notifyPayslipAvailable(driverUserId: string | null): Promise<void> {
  if (driverUserId) {
    await createUserNotification(
      driverUserId,
      'Fiche de paie disponible',
      'Votre fiche de paie est disponible dans votre dossier chauffeur.',
      'hr',
    );
  }
}

export async function notifySalaryPaidByBank(driverUserId: string | null): Promise<void> {
  if (driverUserId) {
    await createUserNotification(
      driverUserId,
      'Salaire RP versé',
      'Votre salaire RP est arrivé sur votre compte chauffeur.',
      'salary',
    );
  }
}

export async function notifyBankAccountActivated(driverUserId: string): Promise<void> {
  await createUserNotification(
    driverUserId,
    'Compte bancaire activé',
    'Votre compte bancaire Z&D Thermoliner est activé.',
    'bank',
  );
}

export async function notifyBankTransferReceived(
  driverUserId: string,
  amount: number,
  reason?: string,
): Promise<void> {
  const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  await createUserNotification(
    driverUserId,
    'Virement reçu',
    `Vous avez reçu un virement de ${formatted}${reason ? ` — ${reason}` : ''} de la banque Z&D Thermoliner.`,
    'bank',
  );
}

export async function notifyCompanyAnnouncement(title: string, message: string): Promise<void> {
  await notifyUsersByRoles(
    ['admin', 'chauffeur', 'visiteur'],
    title,
    message,
    'announcement',
  );
}

export async function notifyIntegrationConnected(profileId: string, providerLabel: string): Promise<void> {
  await createUserNotification(
    profileId,
    'Compte connecté',
    `${providerLabel} est maintenant lié à votre profil Z&D.`,
    'integration',
  );
}

export async function notifyIntegrationDeliveryDetected(profileId: string, route: string): Promise<void> {
  await createUserNotification(
    profileId,
    'Nouvelle livraison détectée',
    route,
    'integration',
  );
}

export async function notifyIntegrationRoadSheetCreated(profileId: string, route: string): Promise<void> {
  await createUserNotification(
    profileId,
    'Feuille de route créée',
    `Une feuille de route a été générée automatiquement : ${route}`,
    'road_sheet',
  );
}

export async function notifyIntegrationSalaryCredited(profileId: string, amount: number): Promise<void> {
  const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  await createUserNotification(
    profileId,
    'Salaire crédité',
    `Votre compte bancaire a été crédité de ${formatted} suite à une livraison synchronisée.`,
    'bank',
  );
}

export async function notifyIntegrationSyncError(
  profileId: string,
  providerLabel: string,
  error: string,
): Promise<void> {
  await createUserNotification(
    profileId,
    'Erreur de synchronisation',
    `${providerLabel} : ${error}`,
    'error',
  );
}
