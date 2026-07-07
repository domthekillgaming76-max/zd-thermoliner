import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt } from '../../lib/format';

const TOOLTIP_STYLE = {
  background: 'rgba(14,14,14,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#fff',
  backdropFilter: 'blur(12px)',
};

export interface BankChartPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface BankFinanceChartsProps {
  data: BankChartPoint[];
  loading?: boolean;
}

export function BankFinanceCharts({ data, loading }: BankFinanceChartsProps) {
  const chartData = data.map(d => ({
    month: d.month,
    income: d.income,
    expenses: d.expenses,
    profit: d.net,
  }));

  const empty = chartData.every(m => m.income === 0 && m.expenses === 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="erp-card rounded-2xl p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Flux de trésorerie</h3>
          <p className="text-[10px] text-white/30 mt-0.5">Solde net mensuel — 6 derniers mois</p>
        </div>
        {loading ? (
          <div className="h-[220px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ) : empty ? (
          <div className="h-[220px] flex items-center justify-center text-white/20 text-sm">
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="bankNetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${fmt(Number(v ?? 0))} €`, 'Flux net']}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#60a5fa"
                strokeWidth={2}
                fill="url(#bankNetGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="erp-card rounded-2xl p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Revenus vs dépenses</h3>
          <p className="text-[10px] text-white/30 mt-0.5">Comparatif mensuel</p>
        </div>
        {loading ? (
          <div className="h-[220px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ) : empty ? (
          <div className="h-[220px] flex items-center justify-center text-white/20 text-sm">
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
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
                  name === 'income' ? 'Revenus' : 'Dépenses',
                ]}
              />
              <Legend
                formatter={value => (value === 'income' ? 'Revenus' : 'Dépenses')}
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
              />
              <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
