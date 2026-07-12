import { supabaseAdmin, isSupabaseAdminReady } from '../../lib/supabaseAdmin.mjs';
import { loadClientContext, displayDriverName } from './middleware.mjs';

export async function handleTachographTicket(req, res) {
  try {
    if (!isSupabaseAdminReady()) {
      return res.status(503).json({ error: 'ERP indisponible' });
    }
    const ctx = await loadClientContext(req);
    const body = req.body ?? {};

    const row = {
      profile_id: ctx.profile.id,
      driver_id: ctx.driver?.id ?? null,
      ticket_id: String(body.ticket_id || body.ticketId || crypto.randomUUID()),
      session_id: body.session_id || body.sessionId || null,
      driver_number: String(body.driver_number || body.driverNumber || 'ZDT-00000'),
      driver_name: String(body.driver_name || body.driverName || displayDriverName(ctx.profile, ctx.driver)),
      body_text: String(body.body_text || body.bodyText || ''),
      distance_km: Number(body.distance_km ?? body.distanceKm ?? 0),
      driving_minutes: Number(body.driving_minutes ?? body.drivingMinutes ?? 0),
      break_minutes: Number(body.break_minutes ?? body.breakMinutes ?? 0),
      rest_minutes: Number(body.rest_minutes ?? body.restMinutes ?? 0),
      avg_speed_kmh: Number(body.avg_speed_kmh ?? body.avgSpeedKmh ?? 0),
      max_speed_kmh: Number(body.max_speed_kmh ?? body.maxSpeedKmh ?? 0),
      consumption_l100: Number(body.consumption_l100 ?? body.consumptionL100 ?? 0),
      mission_label: body.mission_label || body.missionLabel || null,
      status: String(body.status || 'VALIDÉ'),
      created_at: body.created_at || body.createdAt || new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('rp_tachograph_tickets')
      .upsert(row, { onConflict: 'ticket_id' });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, ticket_id: row.ticket_id });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || 'Erreur enregistrement ticket tachygraphe',
    });
  }
}

export async function handleTachographStatus(req, res) {
  try {
    if (!isSupabaseAdminReady()) {
      return res.status(503).json({ error: 'ERP indisponible' });
    }
    const ctx = await loadClientContext(req);

    const { data: tickets } = await supabaseAdmin
      .from('rp_tachograph_tickets')
      .select('*')
      .eq('profile_id', ctx.profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: controls } = await supabaseAdmin
      .from('rp_tachograph_control_requests')
      .select('*')
      .eq('target_profile_id', ctx.profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    const driver = ctx.driver;
    const profile = ctx.profile;

    return res.json({
      ok: true,
      card: {
        driverName: displayDriverName(profile, driver),
        driverNumber: driver?.employee_number || null,
        company: driver?.fleet_name || 'Z&D Thermoliner',
        photoUrl: driver?.photo_url || driver?.avatar_url || profile.avatar_url || profile.truck_photo_url || null,
        licenseNumber: driver?.license_number || null,
        licenseExpiresAt: driver?.license_expires_at || null,
      },
      tickets: tickets ?? [],
      pending_controls: controls ?? [],
      rp_control_available: (controls ?? []).length > 0,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || 'Erreur statut tachygraphe',
    });
  }
}
