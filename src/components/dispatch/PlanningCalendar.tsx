import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MissionCard } from './MissionCard';
import {
  missionStatusColor,
  type CalendarView,
  type TransportMission,
} from '../../lib/dispatchTypes';

interface PlanningCalendarProps {
  missions: TransportMission[];
  onSelectMission: (mission: TransportMission) => void;
  onDropMission?: (missionId: string, newDate: string) => void;
  canEdit?: boolean;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const result = new Date(d);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function PlanningCalendar({ missions, onSelectMission, onDropMission, canEdit }: PlanningCalendarProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    if (view === 'day') return [cursor];
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const start = startOfWeek(first);
    const result: Date[] = [];
    let d = start;
    while (d <= last || result.length % 7 !== 0) {
      result.push(new Date(d));
      d = addDays(d, 1);
      if (result.length > 42) break;
    }
    return result;
  }, [view, cursor]);

  const missionsByDate = useMemo(() => {
    const map = new Map<string, TransportMission[]>();
    for (const m of missions) {
      const key = m.delivery_date?.slice(0, 10);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  }, [missions]);

  function navigate(dir: -1 | 1) {
    const d = new Date(cursor);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  }

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const missionId = e.dataTransfer.getData('missionId');
    if (missionId && onDropMission) onDropMission(missionId, dateStr);
  }

  const title = view === 'day'
    ? cursor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
      ? `Semaine du ${startOfWeek(cursor).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
      : cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="dispatch-glass rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <h3 className="text-sm font-bold text-white capitalize min-w-[180px] text-center">{title}</h3>
          <button type="button" onClick={() => navigate(1)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as CalendarView[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === v ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-white/35 hover:bg-white/5'}`}
            >
              {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <div className="grid grid-cols-7 gap-1 text-[10px] text-white/30 uppercase text-center mb-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d}>{d}</div>)}
        </div>
      )}

      <div className={`grid gap-2 ${view === 'month' ? 'grid-cols-7' : view === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
        {days.map(day => {
          const dateStr = fmtDate(day);
          const dayMissions = missionsByDate.get(dateStr) ?? [];
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = dateStr === fmtDate(new Date());

          return (
            <div
              key={dateStr}
              onDragOver={e => canEdit && e.preventDefault()}
              onDrop={e => canEdit && handleDrop(e, dateStr)}
              className={`rounded-xl border min-h-[80px] p-2 transition-colors ${
                view === 'month' && !isCurrentMonth ? 'border-transparent opacity-40' : 'border-white/5 bg-white/[0.02]'
              } ${isToday ? 'ring-1 ring-red-500/40' : ''} ${canEdit ? 'hover:border-red-500/20' : ''}`}
            >
              <p className={`text-[10px] font-bold mb-1 ${isToday ? 'text-red-400' : 'text-white/40'}`}>
                {view === 'month' ? day.getDate() : day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
              </p>
              <div className="space-y-1">
                {dayMissions.slice(0, view === 'month' ? 2 : 4).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    draggable={canEdit}
                    onDragStart={e => e.dataTransfer.setData('missionId', m.id)}
                    onClick={() => onSelectMission(m)}
                    className="w-full text-left text-[10px] px-1.5 py-1 rounded truncate font-medium text-white/80 hover:opacity-80"
                    style={{ backgroundColor: `${missionStatusColor(m.status)}33`, borderLeft: `2px solid ${missionStatusColor(m.status)}` }}
                  >
                    {m.reference} — {m.arrival_city}
                  </button>
                ))}
                {dayMissions.length > (view === 'month' ? 2 : 4) && (
                  <p className="text-[9px] text-white/30">+{dayMissions.length - (view === 'month' ? 2 : 4)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {view === 'day' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(missionsByDate.get(fmtDate(cursor)) ?? []).map(m => (
            <MissionCard key={m.id} mission={m} onSelect={onSelectMission} draggable={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
