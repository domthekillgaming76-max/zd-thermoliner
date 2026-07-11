import { BarChart3, Percent, Truck, Activity, type LucideIcon } from 'lucide-react';

interface ExecutiveSummaryProps {
  highlights: {
    label: string;
    value: string;
    sub: string;
    positive: boolean;
  }[];
  loading?: boolean;
}

const HIGHLIGHT_ICONS: LucideIcon[] = [BarChart3, Percent, Truck, Activity];
const HIGHLIGHT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6'];

export function ExecutiveSummary({ highlights, loading }: ExecutiveSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {highlights.map((item, i) => {
        const Icon = HIGHLIGHT_ICONS[i] ?? BarChart3;
        const color = HIGHLIGHT_COLORS[i] ?? '#ef4444';

        return (
          <div
            key={item.label}
            className="premium-summary-card group rounded-2xl p-4 md:p-5 opacity-0 animate-dashboard-in hover:-translate-y-1 transition-transform duration-300"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              {!loading && (
                <span
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    item.positive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  }`}
                />
              )}
            </div>

            {loading ? (
              <>
                <div className="h-3 w-24 rounded shimmer mb-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-8 w-32 rounded shimmer mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-2.5 w-40 rounded shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-white/45 uppercase tracking-wide mb-2">
                  {item.label}
                </p>
                <p className="text-xl md:text-2xl font-black text-white mb-1.5 tabular-nums tracking-tight">
                  {item.value}
                </p>
                <p
                  className={`text-xs font-medium leading-snug ${
                    item.positive ? 'text-emerald-400/80' : 'text-amber-400/80'
                  }`}
                >
                  {item.sub}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
