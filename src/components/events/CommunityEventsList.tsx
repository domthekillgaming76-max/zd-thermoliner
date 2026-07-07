import { useMemo } from 'react';
import { Calendar, MapPin, Users, Radio } from 'lucide-react';
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  type CommunityEvent,
} from '../../lib/eventTypes';

interface CommunityEventsListProps {
  events: CommunityEvent[];
  loading?: boolean;
}

export function CommunityEventsList({ events, loading }: CommunityEventsListProps) {
  const grouped = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter(e => e.status === 'published' && new Date(e.start_at) >= now);
    const past = events.filter(e => e.status === 'completed' || new Date(e.start_at) < now);
    return { upcoming, past };
  }, [events]);

  if (loading) {
    return <div className="events-glass h-48 shimmer rounded-xl" />;
  }

  if (events.length === 0) {
    return (
      <div className="events-glass rounded-2xl p-12 text-center">
        <Calendar className="w-12 h-12 text-white/10 mx-auto mb-3" />
        <p className="text-white/30">Aucun événement planifié</p>
        <p className="text-white/20 text-xs mt-1">Les convois communautaires apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.upcoming.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase text-red-400/70 mb-3">À venir</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {grouped.upcoming.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        </section>
      )}
      {grouped.past.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase text-white/30 mb-3">Passés</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {grouped.past.slice(0, 6).map(ev => <EventCard key={ev.id} event={ev} past />)}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({ event, past }: { event: CommunityEvent; past?: boolean }) {
  const typeStyle = EVENT_TYPE_COLORS[event.event_type];
  const start = new Date(event.start_at);

  return (
    <div className={`events-glass events-card-hover rounded-xl p-4 border border-white/5 ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeStyle}`}>
          {EVENT_TYPE_LABELS[event.event_type]}
        </span>
        <span className="text-[10px] text-white/30">
          {start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <h4 className="font-bold text-white mb-1">{event.title}</h4>
      {event.description && <p className="text-xs text-white/40 line-clamp-2 mb-2">{event.description}</p>}
      <div className="flex flex-wrap gap-3 text-[10px] text-white/35">
        {event.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
        )}
        {event.route_label && (
          <span className="flex items-center gap-1"><Radio className="w-3 h-3" />{event.route_label}</span>
        )}
        {event.max_participants > 0 && (
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.max_participants} max</span>
        )}
      </div>
    </div>
  );
}
