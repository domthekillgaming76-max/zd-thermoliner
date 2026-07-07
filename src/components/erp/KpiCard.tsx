import { Link } from 'react-router-dom';
import type { ElementType } from 'react';

export interface KpiCardProps {
  label: string;
  value: string;
  icon: ElementType;
  color: string;
  glow: string;
  loading?: boolean;
  delay?: number;
  to?: string;
  trend?: string;
  subtitle?: string;
  variant?: 'default' | 'highlight';
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  glow,
  loading = false,
  delay = 0,
  to,
  trend,
  subtitle,
  variant = 'default',
}: KpiCardProps) {
  const isHighlight = variant === 'highlight';

  const inner = (
    <div
      className={`erp-card stat-card group relative overflow-hidden rounded-2xl p-4 md:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass opacity-0 animate-slide-up ${
        isHighlight ? 'erp-kpi-highlight' : ''
      }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
        style={{ background: glow }}
      />
      {isHighlight && (
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
        />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `${color}${isHighlight ? '18' : '12'}`,
            border: `1px solid ${color}${isHighlight ? '40' : '30'}`,
            boxShadow: `0 0 24px ${color}${isHighlight ? '20' : '15'}`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-400"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="relative text-white/40 text-[11px] font-semibold mt-3 mb-1 uppercase tracking-wider">
        {label}
      </p>
      {loading ? (
        <div className="h-8 w-28 rounded-lg shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : (
        <p className={`relative font-black text-white animate-counter-up ${isHighlight ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
          {value}
        </p>
      )}
      {subtitle && !loading && (
        <p className="relative text-[10px] text-white/25 mt-1.5">{subtitle}</p>
      )}
    </div>
  );

  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
