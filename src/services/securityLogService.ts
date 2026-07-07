import { supabase } from '../lib/supabase';
import type { AccessAttempt, SecurityEventType, SecurityLog } from '../lib/adminTypes';

export async function logSecurityEvent(input: {
  eventType: SecurityEventType;
  userId?: string | null;
  actorId?: string | null;
  message?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('security_logs').insert({
      user_id: input.userId ?? null,
      actor_id: input.actorId ?? null,
      event_type: input.eventType,
      message: input.message ?? null,
      details: input.details ?? {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (err) {
    console.error('[Z&D] logSecurityEvent:', err);
  }
}

export async function logAccessAttempt(input: {
  userId?: string | null;
  email?: string | null;
  page: string;
  allowed: boolean;
  reason?: string;
}): Promise<void> {
  try {
    await supabase.from('access_attempts').insert({
      user_id: input.userId ?? null,
      email: input.email ?? null,
      page: input.page,
      allowed: input.allowed,
      reason: input.reason ?? null,
    });
    if (!input.allowed) {
      await logSecurityEvent({
        eventType: 'failed_access_attempt',
        userId: input.userId,
        message: `Accès refusé: ${input.page}`,
        details: { page: input.page, reason: input.reason },
      });
    }
  } catch (err) {
    console.error('[Z&D] logAccessAttempt:', err);
  }
}

export async function fetchSecurityLogs(limit = 50): Promise<SecurityLog[]> {
  const { data, error } = await supabase
    .from('security_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id as string,
    user_id: (r.user_id as string) ?? null,
    actor_id: (r.actor_id as string) ?? null,
    event_type: r.event_type as SecurityLog['event_type'],
    message: (r.message as string) ?? null,
    details: (r.details as Record<string, unknown>) ?? {},
    ip_address: (r.ip_address as string) ?? null,
    user_agent: (r.user_agent as string) ?? null,
    created_at: r.created_at as string,
  }));
}

export async function fetchAccessAttempts(limit = 30): Promise<AccessAttempt[]> {
  const { data, error } = await supabase
    .from('access_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AccessAttempt[];
}
