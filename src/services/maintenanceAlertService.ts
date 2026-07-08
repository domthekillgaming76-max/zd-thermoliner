import { supabase } from '../lib/supabase';
import { getMaintenanceAlerts, type FleetMaintenance, type FleetTruck } from '../lib/fleetTypes';

const ALERT_DEDUP_HOURS = 24;

export async function syncMaintenanceNotifications(
  trucks: FleetTruck[],
  maintenance: FleetMaintenance[],
  adminUserIds: string[],
): Promise<void> {
  if (adminUserIds.length === 0) return;

  const alerts = getMaintenanceAlerts(trucks, maintenance);
  const critical = alerts.filter(a => a.urgency === 'high');
  if (critical.length === 0) return;

  const since = new Date(Date.now() - ALERT_DEDUP_HOURS * 3600_000).toISOString();

  for (const alert of critical.slice(0, 5)) {
    for (const userId of adminUserIds) {
      const { data: recent } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'warning')
        .gte('created_at', since)
        .ilike('message', `%${alert.truckLabel}%`)
        .limit(1);

      if (recent && recent.length > 0) continue;

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Alerte maintenance flotte',
        message: `${alert.truckLabel} — ${alert.message}`,
        type: 'warning',
      });
    }
  }
}
