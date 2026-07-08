import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area, Line,
} from 'recharts';
import type { StatisticsBundle } from '../../lib/statisticsTypes';
import { fmtEuro } from '../../lib/format';

const TOOLTIP_STYLE = {
  background: 'rgba(12,12,12,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  fontSize: 11,
};

interface StatisticsChartsProps {
  data: StatisticsBundle;
}

export function StatisticsCharts({ data }: StatisticsChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Kilomètres mensuels" subtitle="Distance parcourue">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyKm}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="km" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution marge entreprise" subtitle="Marge % et profit">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data.marginEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => typeof v === 'number' ? (String(v).includes('margin') ? `${v}%` : fmtEuro(v)) : String(v ?? '')} />
              <Area yAxisId="left" type="monotone" dataKey="profit" fill="rgba(52,211,153,0.1)" stroke="#34d399" />
              <Line yAxisId="right" type="monotone" dataKey="marginPercent" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Revenus par chauffeur" subtitle="Mois en cours">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.revenueByDriver.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <YAxis dataKey="driverName" type="category" width={80} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtEuro(Number(v ?? 0))} />
              <Bar dataKey="revenue" fill="#60a5fa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profit par route" subtitle="Top routes rentables">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.profitByRoute.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="route" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 8 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtEuro(Number(v ?? 0))} />
              <Bar dataKey="profit" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="erp-card rounded-2xl p-5 grid sm:grid-cols-4 gap-4">
        <FuelStat label="Km ce mois" value={`${data.fuelEstimate.kmMonth.toLocaleString('fr-FR')} km`} />
        <FuelStat label="Carburant estimé" value={`${data.fuelEstimate.monthLiters.toLocaleString('fr-FR')} L`} />
        <FuelStat label="Coût carburant" value={fmtEuro(data.fuelEstimate.monthCost)} />
        <FuelStat label="Conso. moyenne" value={`${data.fuelEstimate.avgConsumptionL100} L/100`} />
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="erp-card rounded-2xl p-5">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="text-[10px] text-white/30 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function FuelStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-white/35 font-semibold">{label}</p>
      <p className="text-lg font-bold text-white mt-1">{value}</p>
    </div>
  );
}
