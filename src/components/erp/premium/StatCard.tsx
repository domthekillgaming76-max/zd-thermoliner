import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  unit?: string;
}

export function StatCard({
  label,
  value,
  change,
  trend,
  icon,
  iconColor,
  bgColor,
  borderColor,
  unit,
}: StatCardProps) {
  return (
    <div
      className="group p-5 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-default"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconColor} border border-white/20`}>
          {icon}
        </div>
        {trend && change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
            trend === 'up' ? 'bg-emerald-500/15 text-emerald-300' :
            trend === 'down' ? 'bg-red-500/15 text-red-300' :
            'bg-amber-500/15 text-amber-300'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : 
             trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
             <TrendingUp className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <p className="text-xs text-white/50 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
        {unit && <p className="text-sm text-white/40">{unit}</p>}
      </div>

      {change !== undefined && (
        <p className={`text-xs mt-3 ${
          trend === 'up' ? 'text-emerald-400/70' :
          trend === 'down' ? 'text-red-400/70' :
          'text-amber-400/70'
        }`}>
          {trend === 'up' ? '↗️ Augmentation' :
           trend === 'down' ? '↘️ Diminution' :
           '→ Stable'} ce mois
        </p>
      )}
    </div>
  );
}

interface StatGridProps {
  stats: StatCardProps[];
  columns?: 1 | 2 | 3 | 4;
}

export function StatGrid({ stats, columns = 4 }: StatGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {stats.map((stat, idx) => (
        <StatCard key={idx} {...stat} />
      ))}
    </div>
  );
}
