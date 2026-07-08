import { Banknote } from 'lucide-react';
import type { DriverSalaryRow } from '../../lib/financeTypes';
import { SALARY_STATUS_LABELS, formatFinanceEuro } from '../../lib/financeTypes';

interface FinanceSalariesTableProps {
  salaries: DriverSalaryRow[];
  canPay?: boolean;
  onPay?: (id: string) => void;
  busyId?: string | null;
}

export function FinanceSalariesTable({ salaries, canPay, onPay, busyId }: FinanceSalariesTableProps) {
  if (salaries.length === 0) {
    return (
      <div className="erp-card rounded-2xl p-12 text-center text-white/30 text-sm">
        Aucun enregistrement salarial
      </div>
    );
  }

  return (
    <div className="erp-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-white/35 border-b border-white/5">
              <th className="px-4 py-3">Chauffeur</th>
              <th className="px-4 py-3">Période</th>
              <th className="px-4 py-3">Km</th>
              <th className="px-4 py-3">€/km</th>
              <th className="px-4 py-3">Base</th>
              <th className="px-4 py-3">Bonus livr.</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Statut</th>
              {canPay && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {salaries.map(s => {
              const badge = SALARY_STATUS_LABELS[s.payment_status];
              return (
                <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{s.driver_name}</td>
                  <td className="px-4 py-3 text-white/50">{s.period_month}/{s.period_year}</td>
                  <td className="px-4 py-3 text-white/60">{s.km_total || '—'}</td>
                  <td className="px-4 py-3 text-white/60">{s.km_rate ? `${s.km_rate} €` : '—'}</td>
                  <td className="px-4 py-3 text-white/60">{formatFinanceEuro(s.base_salary)}</td>
                  <td className="px-4 py-3 text-white/60">{formatFinanceEuro(s.delivery_bonus)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{formatFinanceEuro(s.net_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  {canPay && (
                    <td className="px-4 py-3 text-right">
                      {s.payment_status === 'pending' && onPay && (
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => onPay(s.id)}
                          className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          Payer
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
