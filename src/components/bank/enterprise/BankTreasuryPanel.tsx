import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt } from '../../../lib/format';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';
import type { TreasuryMetrics } from '../../../lib/bankTreasuryAnalytics';
import type { BankChartPoint } from '../lounge/BankLoungeCharts';
import { BankGlassPanel } from './BankGlassPanel';

const TOOLTIP = {
  background: 'rgba(6, 24, 16, 0.95)',
  border: `1px solid ${BANK_LOUNGE.panelBorder}`,
  borderRadius: 10,
  color: BANK_LOUNGE.white,
};

interface BankTreasuryPanelProps {
  chartData: BankChartPoint[];
  treasury: TreasuryMetrics;
  loading?: boolean;
}

export function BankTreasuryPanel({ chartData, treasury, loading }: BankTreasuryPanelProps) {
  const empty = chartData.every(m => m.income === 0 && m.expenses === 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Flux de trésorerie" subtitle="Net mensuel — 6 mois" loading={loading} empty={empty}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="treasuryNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BANK_LOUNGE.tealLight} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={BANK_LOUNGE.tealLight} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={TOOLTIP} formatter={v => [`${fmt(Number(v ?? 0))} €`, 'Flux']} />
              <Area type="monotone" dataKey="net" stroke={BANK_LOUNGE.tealLight} fill="url(#treasuryNet)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Solde mensuel" subtitle="Évolution comptable" loading={loading} empty={empty}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={treasury.monthlyBalanceSeries}>
              <XAxis dataKey="month" tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip contentStyle={TOOLTIP} formatter={v => [`${fmt(Number(v ?? 0))} €`, 'Solde']} />
              <Line type="monotone" dataKey="balance" stroke={BANK_LOUNGE.teal} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenus vs dépenses" subtitle="Comparatif mensuel" loading={loading} empty={empty}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(62,191,160,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: BANK_LOUNGE.whiteMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="income" fill={BANK_LOUNGE.tealLight} radius={[4, 4, 0, 0]} maxBarSize={28} name="Revenus" />
              <Bar dataKey="expenses" fill={BANK_LOUNGE.redSoft} radius={[4, 4, 0, 0]} maxBarSize={28} name="Dépenses" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Prévision & trésorerie"
          subtitle={`Cash disponible : ${fmt(treasury.availableCash)} € · Prévision M+1 : ${fmt(treasury.forecastNextMonth)} €`}
          loading={loading}
          empty={false}
        >
          <div className="h-[240px] flex flex-col justify-center gap-4 px-4">
            <ForecastBar label="Trésorerie disponible" value={treasury.availableCash} max={Math.max(treasury.availableCash, 1)} color={BANK_LOUNGE.tealLight} />
            <ForecastBar
              label="Prévision flux net (M+1)"
              value={Math.abs(treasury.forecastNextMonth)}
              max={Math.max(Math.abs(treasury.forecastNextMonth), 1)}
              color={treasury.forecastTrend === 'down' ? BANK_LOUNGE.redSoft : '#60a5fa'}
            />
            <p className="text-xs text-white/40 text-center">
              Tendance {treasury.forecastTrend === 'up' ? 'haussière' : treasury.forecastTrend === 'down' ? 'baissière' : 'stable'} sur 3 mois
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  loading,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <BankGlassPanel className="p-4 md:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[10px] text-white/35 mt-0.5">{subtitle}</p>
      </div>
      {loading ? (
        <div className="h-[240px] rounded-xl shimmer bank-lounge-shimmer" />
      ) : empty ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-white/30">Aucune donnée</div>
      ) : (
        children
      )}
    </BankGlassPanel>
  );
}

function ForecastBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/50">{label}</span>
        <span className="font-bold text-white">{fmt(value)} €</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
