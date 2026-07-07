import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';
import type { BankSummary } from '../../../services/bankService';

interface BankMetricsStripProps {
  summary: BankSummary;
  loading?: boolean;
}

const METRICS = [
  {
    key: 'monthlyIncome' as const,
    label: 'Revenus du mois',
    icon: ArrowUpCircle,
    color: BANK_LOUNGE.tealLight,
    prefix: '+',
    abs: false,
  },
  {
    key: 'monthlyExpenses' as const,
    label: 'Dépenses du mois',
    icon: ArrowDownCircle,
    color: BANK_LOUNGE.redSoft,
    prefix: '-',
    abs: true,
  },
  {
    key: 'netCashflow' as const,
    label: 'Flux net',
    icon: TrendingUp,
    color: BANK_LOUNGE.teal,
    prefix: '',
    abs: false,
    dynamicSign: true,
  },
  {
    key: 'pendingPayments' as const,
    label: 'Paiements à venir',
    icon: CalendarClock,
    color: '#f0b429',
    prefix: '',
    abs: false,
    isCount: true,
  },
];

export function BankMetricsStrip({ summary, loading }: BankMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {METRICS.map(metric => {
        const Icon = metric.icon;
        const raw = summary[metric.key];
        const value = metric.isCount ? raw : metric.abs ? Math.abs(raw) : raw;
        const sign =
          metric.dynamicSign && typeof raw === 'number'
            ? raw >= 0
              ? '+'
              : ''
            : metric.prefix;

        return (
          <div key={metric.key} className="bank-lounge-metric rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: metric.color }} />
              <p className="text-[10px] uppercase tracking-wider font-semibold leading-tight" style={{ color: BANK_LOUNGE.whiteMuted }}>
                {metric.label}
              </p>
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded-lg shimmer bank-lounge-shimmer" />
            ) : metric.isCount ? (
              <p className="text-2xl font-black" style={{ color: metric.color }}>
                {value}
                <span className="text-xs font-semibold ml-1 text-white/40">feuilles</span>
              </p>
            ) : (
              <p className="text-xl font-black" style={{ color: metric.color }}>
                {sign}
                {formatCurrency(value as number)} €
              </p>
            )}
            {metric.key === 'pendingPayments' && !loading && (
              <p className="text-[10px] mt-1" style={{ color: BANK_LOUNGE.whiteMuted }}>
                Feuilles non comptabilisées
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
