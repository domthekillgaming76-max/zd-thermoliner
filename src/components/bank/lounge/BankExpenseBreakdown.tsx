import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../../lib/bankUtils';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';
import type { ExpenseBreakdown } from '../../../types/dashboard';

const SLICE_COLORS = [
  BANK_LOUNGE.teal,
  BANK_LOUNGE.tealLight,
  '#2D6A5A',
  BANK_LOUNGE.redSoft,
  '#5A8F7B',
];

const LABELS: Record<keyof ExpenseBreakdown, string> = {
  fuel: 'Carburant',
  tolls: 'Péages',
  repairs: 'Réparations',
  salaries: 'Salaires',
  other: 'Autres',
};

interface BankExpenseBreakdownProps {
  breakdown: ExpenseBreakdown;
  loading?: boolean;
}

export function BankExpenseBreakdown({ breakdown, loading }: BankExpenseBreakdownProps) {
  const entries = (Object.keys(LABELS) as (keyof ExpenseBreakdown)[]).map(key => ({
    key,
    label: LABELS[key],
    value: breakdown[key],
  }));

  const total = entries.reduce((s, e) => s + e.value, 0);
  const chartData = entries.filter(e => e.value > 0).map(e => ({ name: e.label, value: e.value }));

  return (
    <section className="bank-lounge-panel rounded-2xl p-5 md:p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
          style={{ background: 'rgba(214, 107, 107, 0.15)', color: BANK_LOUNGE.redSoft }}
        >
          %
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: BANK_LOUNGE.white }}>
            Répartition des dépenses
          </h2>
          <p className="text-[10px]" style={{ color: BANK_LOUNGE.whiteMuted }}>
            Mois en cours
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] rounded-xl shimmer bank-lounge-shimmer" />
      ) : total === 0 ? (
        <div
          className="h-[200px] flex items-center justify-center text-sm rounded-xl"
          style={{ color: BANK_LOUNGE.whiteMuted, background: 'rgba(0,0,0,0.15)' }}
        >
          Aucune dépense ce mois-ci
        </div>
      ) : (
        <>
          <div className="h-[180px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(6, 24, 16, 0.95)',
                    border: `1px solid ${BANK_LOUNGE.panelBorder}`,
                    borderRadius: 10,
                    color: BANK_LOUNGE.white,
                  }}
                  formatter={v => [`${formatCurrency(Number(v ?? 0))} €`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2">
            {entries.map((entry, i) => {
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <li key={entry.key} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="truncate" style={{ color: BANK_LOUNGE.whiteMuted }}>
                      {entry.label}
                    </span>
                  </div>
                  <span className="font-semibold flex-shrink-0" style={{ color: BANK_LOUNGE.white }}>
                    {formatCurrency(entry.value)} €
                    <span className="text-white/30 ml-1">({pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
