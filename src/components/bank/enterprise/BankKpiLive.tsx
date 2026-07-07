import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Radio,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import type { BankSummary } from '../../../services/bankService';
import type { TreasuryMetrics } from '../../../lib/bankTreasuryAnalytics';
import { BankGlassPanel } from './BankGlassPanel';

interface BankKpiLiveProps {
  summary: BankSummary;
  treasury: TreasuryMetrics;
  loading?: boolean;
}

export function BankKpiLive({ summary, treasury, loading }: BankKpiLiveProps) {
  const items = [
    { label: 'Revenus mensuels', value: summary.monthlyIncome, icon: ArrowUpCircle, prefix: '+', color: '#3EBFA0' },
    { label: 'Dépenses mensuelles', value: summary.monthlyExpenses, icon: ArrowDownCircle, prefix: '-', color: '#D66B6B', abs: true },
    { label: 'Flux net', value: summary.netCashflow, icon: TrendingUp, prefix: summary.netCashflow >= 0 ? '+' : '', color: '#1F8A70' },
    { label: 'Trésorerie disponible', value: treasury.availableCash, icon: Radio, prefix: '', color: '#3EBFA0' },
    { label: 'Prévision M+1', value: treasury.forecastNextMonth, icon: TrendingUp, prefix: treasury.forecastTrend === 'up' ? '+' : '', color: '#60a5fa' },
    { label: 'Paiements à venir', value: summary.pendingPayments, icon: CalendarClock, isCount: true, color: '#f0b429' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <BankGlassPanel key={item.label} className="p-4" delay={i * 50}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color: item.color }} />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 leading-tight">{item.label}</p>
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded shimmer bank-lounge-shimmer" />
            ) : item.isCount ? (
              <p className="text-xl font-black" style={{ color: item.color }}>
                {item.value}
                <span className="text-xs text-white/35 ml-1">feuilles</span>
              </p>
            ) : (
              <p className="text-lg font-black" style={{ color: item.color }}>
                {item.prefix}
                {formatCurrency(item.abs ? Math.abs(item.value as number) : (item.value as number))} €
              </p>
            )}
          </BankGlassPanel>
        );
      })}
    </div>
  );
}
