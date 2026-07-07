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
import { fmt } from '../../../lib/format';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';

const TOOLTIP_STYLE = {
  background: 'rgba(6, 24, 16, 0.95)',
  border: `1px solid ${BANK_LOUNGE.panelBorder}`,
  borderRadius: 10,
  color: BANK_LOUNGE.white,
};

export interface BankChartPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface BankLoungeChartsProps {
  data: BankChartPoint[];
  loading?: boolean;
}

export function BankLoungeCharts({ data, loading }: BankLoungeChartsProps) {
  const chartData = data.map(d => ({
    month: d.month,
    income: d.income,
    expenses: d.expenses,
    profit: d.net,
  }));

  const empty = chartData.every(m => m.income === 0 && m.expenses === 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bank-lounge-panel rounded-2xl p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold" style={{ color: BANK_LOUNGE.white }}>
            Flux de trésorerie
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Solde net mensuel — 6 derniers mois
          </p>
        </div>
        {loading ? (
          <div className="h-[220px] rounded-xl shimmer bank-lounge-shimmer" />
        ) : empty ? (
          <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="loungeNetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BANK_LOUNGE.tealLight} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={BANK_LOUNGE.tealLight} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={v => [`${fmt(Number(v ?? 0))} €`, 'Flux net']}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke={BANK_LOUNGE.tealLight}
                strokeWidth={2}
                fill="url(#loungeNetGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bank-lounge-panel rounded-2xl p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold" style={{ color: BANK_LOUNGE.white }}>
            Revenus vs dépenses
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Comparatif mensuel
          </p>
        </div>
        {loading ? (
          <div className="h-[220px] rounded-xl shimmer bank-lounge-shimmer" />
        ) : empty ? (
          <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(62, 191, 160, 0.08)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }}
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
                wrapperStyle={{ fontSize: 11, color: BANK_LOUNGE.whiteMuted }}
              />
              <Bar dataKey="income" fill={BANK_LOUNGE.tealLight} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expenses" fill={BANK_LOUNGE.redSoft} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
