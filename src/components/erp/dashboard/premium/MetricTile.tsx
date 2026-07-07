import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DashboardMetric } from '../../../../hooks/useDashboardMetrics';

interface MetricTileProps {
  metric: DashboardMetric;
  loading?: boolean;
  delay?: number;
}

export function MetricTile({ metric, loading, delay = 0 }: MetricTileProps) {
  const isPositive = (metric.change ?? 0) >= 0;

  const inner = (
    <div
      className={`premium-metric-tile group relative overflow-hidden rounded-2xl p-4 md:p-5 transition-all duration-300 hover:-translate-y-0.5 opacity-0 animate-slide-up ${
        metric.highlight ? 'premium-metric-highlight' : ''
      }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
        style={{ background: metric.glow }}
      />

      {metric.highlight && (
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${metric.color}50, transparent)` }}
        />
      )}

      <div className="relative flex items-start justify-between gap-2 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{
            background: `${metric.color}15`,
            border: `1px solid ${metric.color}30`,
            boxShadow: `0 0 20px ${metric.color}15`,
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: metric.color }} />
        </div>

        {metric.changeLabel && !loading && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
            style={{
              background: isPositive ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${isPositive ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}
          >
            {isPositive ? (
              <TrendingUp className="w-2.5 h-2.5" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5" />
            )}
            {metric.changeLabel}
          </span>
        )}
      </div>

      <p className="relative text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1">
        {metric.label}
      </p>

      {loading ? (
        <div className="h-8 w-28 rounded-lg shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : (
        <p
          className={`relative font-black text-white ${
            metric.highlight ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
          }`}
        >
          {metric.value}
        </p>
      )}
    </div>
  );

  return metric.to ? (
    <Link to={metric.to} className="block h-full">
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((metric, i) => (
        <MetricTile key={metric.id} metric={metric} loading={loading} delay={i * 50} />
      ))}
    </div>
  );
}
