import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Fuel, Receipt, Wrench, Users, MoreHorizontal } from 'lucide-react';
import { fmt } from '../../../../lib/format';
import type { ExpenseBreakdown } from '../../../../types/dashboard';

const CATEGORIES = [
  { key: 'fuel' as const, label: 'Carburant', color: '#fbbf24', icon: Fuel },
  { key: 'tolls' as const, label: 'Péages', color: '#fb923c', icon: Receipt },
  { key: 'repairs' as const, label: 'Réparations', color: '#f87171', icon: Wrench },
  { key: 'salaries' as const, label: 'Salaires', color: '#a78bfa', icon: Users },
  { key: 'other' as const, label: 'Autres', color: '#94a3b8', icon: MoreHorizontal },
];

const TOOLTIP_STYLE = {
  background: 'rgba(10,10,10,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#fff',
};

interface ExpenseBreakdownPanelProps {
  breakdown: ExpenseBreakdown;
  loading?: boolean;
  fmtEuro: (n: number) => string;
}

export function ExpenseBreakdownPanel({ breakdown, loading, fmtEuro }: ExpenseBreakdownPanelProps) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const chartData = CATEGORIES.map(c => ({
    name: c.label,
    value: breakdown[c.key],
    color: c.color,
  })).filter(d => d.value > 0);

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-bold text-white">Répartition des dépenses</h2>
        <p className="text-[11px] text-white/30 mt-0.5">Mois en cours</p>
      </div>

      {loading ? (
        <div className="flex-1 min-h-[200px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
          Aucune dépense enregistrée
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${fmt(Number(v ?? 0))} €`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] text-white/30 uppercase">Total</p>
                <p className="text-lg font-black text-white">{fmtEuro(total)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 flex-1">
            {CATEGORIES.map(cat => {
              const value = breakdown[cat.key];
              const pct = total > 0 ? (value / total) * 100 : 0;
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}25` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/60 font-medium">{cat.label}</span>
                      <span className="text-[11px] font-bold text-white">{fmtEuro(value)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
