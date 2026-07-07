import {
  Calculator,
  Fuel,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { RoadSheetFullEconomics } from '../../lib/roadSheetCalculations';

interface RoadSheetEconomicsPreviewProps {
  economics: RoadSheetFullEconomics;
  compact?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function MetricRow({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-white/40">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight
            ? negative
              ? 'text-red-400'
              : 'text-emerald-400'
            : 'text-white/80'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function RoadSheetEconomicsPreview({ economics, compact = false }: RoadSheetEconomicsPreviewProps) {
  const profitPositive = economics.netProfit >= 0;

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="bg-white/3 rounded-lg p-2.5">
          <p className="text-white/30 text-xs mb-0.5">Revenu</p>
          <p className="text-emerald-400 font-semibold">{formatCurrency(economics.revenue)} €</p>
        </div>
        <div className="bg-white/3 rounded-lg p-2.5">
          <p className="text-white/30 text-xs mb-0.5">Dépenses</p>
          <p className="text-red-400 font-semibold">{formatCurrency(economics.totalExpenses)} €</p>
        </div>
        <div className="bg-white/3 rounded-lg p-2.5">
          <p className="text-white/30 text-xs mb-0.5">Marge</p>
          <p className={`font-semibold ${profitPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {economics.marginPercent.toFixed(1)} %
          </p>
        </div>
        <div className="bg-white/3 rounded-lg p-2.5">
          <p className="text-white/30 text-xs mb-0.5">Profit net</p>
          <p className={`font-semibold ${profitPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(economics.netProfit)} €
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Aperçu financier</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-3"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Revenu</span>
          </div>
          <p className="text-lg font-black text-emerald-400 tabular-nums">
            {formatCurrency(economics.revenue)} €
          </p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{
            background: profitPositive ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)',
            border: profitPositive
              ? '1px solid rgba(52,211,153,0.15)'
              : '1px solid rgba(239,68,68,0.15)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-white/50" />
            <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Profit net</span>
          </div>
          <p
            className={`text-lg font-black tabular-nums ${
              profitPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(economics.netProfit)} €
          </p>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <MetricRow
          label="Carburant"
          value={`${formatCurrency(economics.fuelLiters)} L — ${formatCurrency(economics.fuelCost)} €`}
        />
        <MetricRow label="Péages" value={`${formatCurrency(economics.tollCost)} €`} />
        <MetricRow label="Réparations" value={`${formatCurrency(economics.repairCost)} €`} />
        <MetricRow label="Assurance" value={`${formatCurrency(economics.insuranceCost)} €`} />
        <MetricRow label="Autres dépenses" value={`${formatCurrency(economics.otherExpenses)} €`} />
        <MetricRow label="Salaire chauffeur" value={`${formatCurrency(economics.driverSalary)} €`} />
        <MetricRow
          label="Total dépenses"
          value={`${formatCurrency(economics.totalExpenses)} €`}
          negative
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          {profitPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <div>
            <p className="text-[10px] text-white/30 uppercase">Marge</p>
            <p className={`text-sm font-bold ${profitPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {economics.marginPercent.toFixed(1)} %
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[10px] text-white/30 uppercase">Coût / km</p>
            <p className="text-sm font-bold text-white/80 tabular-nums">
              {formatCurrency(economics.costPerKm)} €
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
