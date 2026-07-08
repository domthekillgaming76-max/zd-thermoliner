import {
  TrendingUp, TrendingDown, Wallet, FileText, CheckCircle, AlertTriangle, Users, Percent,
} from 'lucide-react';
import type { FinanceDashboard } from '../../lib/financeTypes';
import { formatFinanceEuro } from '../../lib/financeTypes';

interface FinanceKpiGridProps {
  dashboard: FinanceDashboard;
}

const KPIS = [
  { key: 'monthlyRevenue', label: 'Revenus mensuels', icon: TrendingUp, color: 'text-emerald-400', format: formatFinanceEuro },
  { key: 'monthlyExpenses', label: 'Dépenses mensuelles', icon: TrendingDown, color: 'text-red-400', format: formatFinanceEuro },
  { key: 'netProfit', label: 'Bénéfice net', icon: Wallet, color: 'text-blue-400', format: formatFinanceEuro },
  { key: 'marginPercent', label: 'Marge', icon: Percent, color: 'text-amber-400', format: (n: number) => `${n}%` },
  { key: 'cashBalance', label: 'Trésorerie', icon: Wallet, color: 'text-cyan-400', format: formatFinanceEuro },
  { key: 'pendingInvoices', label: 'Factures en attente', icon: FileText, color: 'text-orange-400', format: (n: number) => String(n) },
  { key: 'paidInvoices', label: 'Factures payées', icon: CheckCircle, color: 'text-emerald-400', format: (n: number) => String(n) },
  { key: 'overdueInvoices', label: 'Factures en retard', icon: AlertTriangle, color: 'text-red-400', format: (n: number) => String(n) },
  { key: 'salariesToPay', label: 'Salaires à payer', icon: Users, color: 'text-amber-400', format: (n: number) => String(n) },
] as const;

export function FinanceKpiGrid({ dashboard }: FinanceKpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {KPIS.map(kpi => {
        const value = dashboard[kpi.key as keyof FinanceDashboard] as number;
        return (
          <div key={kpi.key} className="erp-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <p className="text-[10px] uppercase tracking-wide text-white/35 font-semibold">{kpi.label}</p>
            </div>
            <p className="text-xl font-bold text-white">{kpi.format(value)}</p>
            {kpi.key === 'salariesToPay' && dashboard.salariesToPayAmount > 0 && (
              <p className="text-xs text-white/40 mt-1">{formatFinanceEuro(dashboard.salariesToPayAmount)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
