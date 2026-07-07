import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Activity } from 'lucide-react';
import { fmt } from '../../../../lib/format';
import type { WeeklyDataPoint, OperationalMetrics } from '../../../../types/dashboard';

const TOOLTIP_STYLE = {
  background: 'rgba(10,10,10,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#fff',
};

interface WeeklyPerformanceProps {
  data: WeeklyDataPoint[];
  operational: OperationalMetrics;
  loading?: boolean;
  fmtEuro: (n: number) => string;
}

export function WeeklyPerformance({ data, operational, loading, fmtEuro }: WeeklyPerformanceProps) {
  const hasData = data.some(d => d.deliveries > 0 || d.revenue > 0);

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Activité hebdomadaire</h2>
            <p className="text-[11px] text-white/30">7 derniers jours</p>
          </div>
        </div>

        {!loading && (
          <div className="flex gap-5 flex-wrap">
            <Stat label="Km parcourus" value={`${fmt(operational.totalKmMonth)} km`} />
            <Stat label="Rev./livraison" value={fmtEuro(operational.avgRevenuePerDelivery)} />
            <Stat label="En cours" value={String(operational.activeAssignments)} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[200px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : !hasData ? (
        <div className="h-[200px] flex items-center justify-center text-white/20 text-sm">
          Aucune activité cette semaine
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="weeklyRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="weeklyDeliveries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [
                name === 'revenue' ? `${fmt(Number(v ?? 0))} €` : String(v ?? 0),
                name === 'revenue' ? 'Revenus' : 'Livraisons',
              ]}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#weeklyRevenue)"
              dot={false}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="deliveries"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#weeklyDeliveries)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}
