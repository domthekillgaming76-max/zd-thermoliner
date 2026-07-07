import {
  Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ComposedChart, Line,
} from 'recharts';
import type { MonthlyFinancePoint } from '../../lib/reportsTypes';
import { formatReportCurrency } from '../../lib/reportsTypes';

const TOOLTIP_STYLE = {
  background: 'rgba(10,10,10,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
};

interface ReportsFinanceChartProps {
  data: MonthlyFinancePoint[];
  loading?: boolean;
}

export function ReportsFinanceChart({ data, loading }: ReportsFinanceChartProps) {
  if (loading) return <div className="reports-glass h-64 shimmer rounded-xl" />;

  const hasData = data.some(m => m.income > 0 || m.expenses > 0);
  if (!hasData) {
    return (
      <div className="reports-glass h-64 rounded-xl flex items-center justify-center text-white/30 text-sm">
        Aucune donnée financière
      </div>
    );
  }

  return (
    <div className="reports-glass rounded-xl p-4">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => `${Math.round(v / 1000)}k`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => formatReportCurrency(Number(v ?? 0))}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
          <Bar dataKey="income" name="Revenus" fill="#34d399" radius={[4, 4, 0, 0]} barSize={18} />
          <Bar dataKey="expenses" name="Dépenses" fill="#f87171" radius={[4, 4, 0, 0]} barSize={18} />
          <Line type="monotone" dataKey="profit" name="Bénéfice" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
