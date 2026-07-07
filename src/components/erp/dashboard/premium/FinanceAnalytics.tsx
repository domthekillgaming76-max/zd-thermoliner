import {
  Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Line, ComposedChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { fmt } from '../../../../lib/format';
import type { ChartDataPoint } from '../../../../types/dashboard';

const TOOLTIP_STYLE = {
  background: 'rgba(10,10,10,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#fff',
  backdropFilter: 'blur(16px)',
  fontSize: 12,
};

interface FinanceAnalyticsProps {
  data: ChartDataPoint[];
  loading?: boolean;
  revenueMonth: number;
  expensesMonth: number;
  netProfit: number;
  fmtEuro: (n: number) => string;
}

export function FinanceAnalytics({
  data,
  loading,
  revenueMonth,
  expensesMonth,
  netProfit,
  fmtEuro,
}: FinanceAnalyticsProps) {
  const hasData = data.some(m => m.income > 0 || m.expenses > 0);

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Performance financière</h2>
            <p className="text-[11px] text-white/30 mt-0.5">6 derniers mois — revenus, dépenses & bénéfice</p>
          </div>
        </div>

        {!loading && (
          <div className="flex gap-4 flex-wrap">
            <div className="text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Revenus</p>
              <p className="text-sm font-bold text-emerald-400">{fmtEuro(revenueMonth)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Dépenses</p>
              <p className="text-sm font-bold text-red-400">{fmtEuro(expensesMonth)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Net</p>
              <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {fmtEuro(netProfit)}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 min-h-[260px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : !hasData ? (
        <div className="flex-1 min-h-[260px] flex items-center justify-center text-white/20 text-sm">
          Aucune donnée financière disponible
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} barGap={3}>
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
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 12 }}
            />
            <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.85} />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.85} />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={{ fill: '#60a5fa', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#60a5fa' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
