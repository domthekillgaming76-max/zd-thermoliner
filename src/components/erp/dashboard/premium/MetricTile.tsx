import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Coins, CalendarDays, Building2, Wallet,
  Users, Truck, ClipboardList, PackageCheck, type LucideIcon,
} from 'lucide-react';
import type { DashboardMetric } from '../../../../hooks/useDashboardMetrics';

const METRIC_ICONS: Record<string, LucideIcon> = {
  'revenue-today': Coins,
  'revenue-month': CalendarDays,
  balance: Building2,
  profit: Wallet,
  drivers: Users,
  trucks: Truck,
  pending: ClipboardList,
  deliveries: PackageCheck,
};

interface MetricTileProps {
  metric: DashboardMetric;
  loading?: boolean;
  delay?: number;
}

export function MetricTile({ metric, loading, delay = 0 }: MetricTileProps) {
  const isPositive = (metric.change ?? 0) >= 0;
  const Icon = METRIC_ICONS[metric.id] ?? Coins;

  const inner = (
    <div
      className={`premium-metric-tile group relative overflow-hidden rounded-2xl p-4 md:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg opacity-0 animate-dashboard-in ${
        metric.highlight ? 'premium-metric-highlight' : ''
      }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
        style={{ background: metric.glow }}
      />

      {metric.highlight && (
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${metric.color}60, transparent)` }}
        />
      )}

      <div className="relative flex items-start justify-between gap-2 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{
            background: `${metric.color}18`,
            border: `1px solid ${metric.color}35`,
            boxShadow: `0 0 24px ${metric.color}20`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: metric.color }} />
        </div>

        {metric.changeLabel && !loading && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
            style={{
              background: isPositive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${isPositive ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
            }}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {metric.changeLabel}
          </span>
        )}
      </div>

      <p className="relative text-white/50 text-xs font-semibold uppercase tracking-wide mb-1.5">
        {metric.label}
      </p>

      {loading ? (
        <div className="h-9 w-32 rounded-lg shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : (
        <p
          className={`relative font-black text-white tabular-nums tracking-tight dashboard-value-pop ${
            metric.highlight ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
          }`}
          style={{ animationDelay: `${delay + 120}ms` }}
        >
          {metric.value}
        </p>
      )}

      {metric.to && !loading && (
        <p className="relative text-[10px] text-white/25 mt-2 group-hover:text-red-300/60 transition-colors">
          Voir le détail →
        </p>
      )}
    </div>
  );

  return metric.to ? (
    <Link to={metric.to} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 rounded-2xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}

interface MetricsGridProps {
  metrics: DashboardMetric[];
  loading?: boolean;
}

export function MetricsGrid({ metrics, loading }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((metric, i) => (
        <MetricTile key={metric.id} metric={metric} loading={loading} delay={i * 70} />
      ))}
    </div>
  );
}
