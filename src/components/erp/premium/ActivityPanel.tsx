import { Activity, AlertCircle } from 'lucide-react';

interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  progress?: number;
}

const STATUS_COLORS = {
  active: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-300' },
  paused: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-300' },
  completed: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', text: 'text-cyan-300' },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-300' },
};

function ActivityItem({ icon, title, description, timestamp, status, progress }: ActivityItemProps) {
  const colors = STATUS_COLORS[status];

  return (
    <div
      className={`p-4 rounded-lg border transition-all duration-200 hover:border-opacity-50 ${colors.bg} ${colors.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-white truncate">{title}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${colors.text}`}>
              {status === 'active' ? 'En cours' :
               status === 'paused' ? 'En pause' :
               status === 'completed' ? 'Terminé' :
               'Erreur'}
            </span>
          </div>
          <p className="text-xs text-white/50 mb-2">{description}</p>
          {progress !== undefined && (
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-500 ${
                  status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
                  status === 'paused' ? 'bg-amber-500' :
                  status === 'completed' ? 'bg-cyan-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-white/40">{timestamp}</p>
        </div>
      </div>
    </div>
  );
}

interface ActivityPanelProps {
  title: string;
  subtitle?: string;
  items: ActivityItemProps[];
  emptyMessage?: string;
}

export function ActivityPanel({
  title,
  subtitle,
  items,
  emptyMessage = 'Aucune activité récente',
}: ActivityPanelProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(31,31,31,0.6) 0%, rgba(15,15,15,0.8) 100%)',
        border: '1px solid rgba(239,68,68,0.15)',
      }}
    >
      <div
        className="p-5 md:p-6 border-b"
        style={{ borderColor: 'rgba(239,68,68,0.1)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        {subtitle && <p className="text-xs text-white/50 ml-8">{subtitle}</p>}
      </div>

      <div className="p-5 md:p-6 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertCircle className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-center text-white/30 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <ActivityItem key={idx} {...item} />
          ))
        )}
      </div>
    </div>
  );
}
