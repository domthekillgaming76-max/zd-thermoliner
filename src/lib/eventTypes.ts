export type CommunityEventType = 'convoy' | 'meetup' | 'tournament' | 'training' | 'other';
export type CommunityEventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: CommunityEventType;
  start_at: string;
  end_at: string | null;
  location: string | null;
  route_label: string | null;
  max_participants: number;
  status: CommunityEventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const EVENT_TYPE_LABELS: Record<CommunityEventType, string> = {
  convoy: 'Convoi',
  meetup: 'Rencontre',
  tournament: 'Tournoi',
  training: 'Formation',
  other: 'Autre',
};

export const EVENT_TYPE_COLORS: Record<CommunityEventType, string> = {
  convoy: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  meetup: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  tournament: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  training: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  other: 'text-white/50 bg-white/5 border-white/10',
};

export interface EventsDashboardStats {
  upcomingEvents: number;
  liveConvoys: number;
  completedThisMonth: number;
}

export function computeEventsDashboard(
  events: CommunityEvent[],
  liveConvoyCount: number,
): EventsDashboardStats {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  return {
    upcomingEvents: events.filter(e =>
      e.status === 'published' && new Date(e.start_at) >= now,
    ).length,
    liveConvoys: liveConvoyCount,
    completedThisMonth: events.filter(e =>
      e.status === 'completed' && e.start_at.startsWith(month),
    ).length,
  };
}
