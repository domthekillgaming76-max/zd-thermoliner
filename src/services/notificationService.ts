import { supabase } from '../lib/supabase';
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
  | 'app_update';

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

export async function notifyFreightOffer(title: string, message: string): Promise<void> {
  await notifyUsersByRoles(
    ['pdg', 'patron', 'admin', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire'],
    title,
    message,
    'freight',
  );
}

export async function notifyRoadSheetValidated(driverUserId: string | null, route: string): Promise<void> {
  if (driverUserId) {
    await createUserNotification(driverUserId, 'Feuille de route validée', route, 'road_sheet');
  }
  await notifyUsersByRoles(['pdg', 'patron', 'admin', 'directeur', 'dispatcher'], 'Feuille validée', route, 'road_sheet');
}

export async function notifyRoadSheetRejected(driverUserId: string | null, route: string): Promise<void> {
  if (driverUserId) {
    await createUserNotification(driverUserId, 'Feuille de route refusée', route, 'warning');
  }
}

export async function notifySalaryPaid(driverUserId: string | null, amount: string): Promise<void> {
  if (driverUserId) {
    await createUserNotification(driverUserId, 'Salaire payé', `Votre salaire de ${amount} a été versé.`, 'salary');
  }
}

export async function notifyCompanyAnnouncement(title: string, message: string): Promise<void> {
  await notifyUsersByRoles(
    ['pdg', 'patron', 'admin', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'manager'],
    title,
    message,
    'announcement',
  );
}
