import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, CartesianGrid,
} from 'recharts';
import { fmt } from '../../lib/format';

const TOOLTIP_STYLE = {
  background: 'rgba(14,14,14,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#fff',
  backdropFilter: 'blur(12px)',
};

export interface ChartDataPoint {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

interface MiniChartProps {
  title: string;
  dataKey: 'income' | 'expenses' | 'profit';
  color: string;
  gradientId: string;
  data: ChartDataPoint[];
  loading?: boolean;
}

export function MiniChart({ title, dataKey, color, gradientId, data, loading }: MiniChartProps) {
  const labels = { income: 'Revenus', expenses: 'Dépenses', profit: 'Bénéfice' };
  const total = data.reduce((s, m) => s + m[dataKey], 0);

  return (
    <div className="erp-card rounded-2xl p-4 md:p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {!loading && (
          <span className="text-xs font-semibold" style={{ color }}>
            {dataKey === 'expenses' ? '-' : ''}{fmt(Math.abs(total))} €
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex-1 min-h-[140px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : data.every(m => m[dataKey] === 0) ? (
        <div className="flex-1 min-h-[140px] flex items-center justify-center text-white/20 text-xs">
          Aucune donnée
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              stroke="transparent"
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [`${fmt(Number(v ?? 0))} €`, labels[dataKey]]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface CombinedChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

export function CombinedFinanceChart({ data, loading }: CombinedChartProps) {
  return (
    <div className="erp-card rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Performance financière</h3>
          <p className="text-[10px] text-white/30 mt-0.5">6 derniers mois — revenus, dépenses & bénéfice</p>
        </div>
      </div>
      {loading ? (
        <div className="h-[220px] md:h-[280px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : data.every(m => m.income === 0 && m.expenses === 0) ? (
        <div className="h-[220px] md:h-[280px] flex items-center justify-center text-white/20 text-sm">
          Aucune donnée financière
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${fmt(v)}`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [
                `${fmt(Number(v ?? 0))} €`,
                name === 'income' ? 'Revenus' : name === 'expenses' ? 'Dépenses' : 'Bénéfice',
              ]}
            />
            <Legend
              formatter={value =>
                value === 'income' ? 'Revenus' : value === 'expenses' ? 'Dépenses' : 'Bénéfice'
              }
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
            />
            <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="profit" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
