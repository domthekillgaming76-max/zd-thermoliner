import { supabase } from '../lib/supabase';
import type { CommunityEvent, CommunityEventType } from '../lib/eventTypes';

function isEventsSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

export async function fetchCommunityEvents(): Promise<CommunityEvent[]> {
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .in('status', ['published', 'completed'])
    .order('start_at', { ascending: true });
  if (error) {
    if (isEventsSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as CommunityEvent[];
}

export async function fetchEventsModuleBundle() {
  const { error: probe } = await supabase.from('community_events').select('id').limit(1);
  const migrationRequired = !!probe && isEventsSchemaError(probe);

  const [events, convoys] = await Promise.all([
    fetchCommunityEvents().catch(() => [] as CommunityEvent[]),
    supabase.from('live_convoys').select('id, status').limit(100),
  ]);

  const liveCount = (convoys.data ?? []).filter(c => c.status === 'en_route').length;

  return {
    events,
    liveConvoyCount: liveCount,
    migrationRequired,
  };
}

export async function createCommunityEvent(input: {
  title: string;
  description?: string;
  event_type: CommunityEventType;
  start_at: string;
  end_at?: string;
  location?: string;
  route_label?: string;
  max_participants?: number;
}, createdBy: string): Promise<CommunityEvent> {
  const { data, error } = await supabase.from('community_events').insert({
    title: input.title,
    description: input.description ?? null,
    event_type: input.event_type,
    start_at: input.start_at,
    end_at: input.end_at ?? null,
    location: input.location ?? null,
    route_label: input.route_label ?? null,
    max_participants: input.max_participants ?? 0,
    status: 'published',
    created_by: createdBy,
  }).select().single();
  if (error) throw error;
  return data as CommunityEvent;
}
