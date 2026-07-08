import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ChevronRight } from 'lucide-react';
import { useDriverSalaries } from '../../hooks/useFinance';
import { fetchDriverByUserId } from '../../services/roadSheetService';import { formatFinanceEuro } from '../../lib/financeTypes';
import type { DriverSalaryRow } from '../../lib/financeTypes';

interface DriverSalarySummaryProps {
  userId?: string;
}

export function DriverSalarySummary({ userId }: DriverSalarySummaryProps) {
  const [driverId, setDriverId] = useState<string | undefined>();
  useEffect(() => {
    if (!userId) return;
    fetchDriverByUserId(userId).then(d => setDriverId(d?.id));
  }, [userId]);

  const { data: salaries = [], isLoading } = useDriverSalaries(driverId);
  const pending = salaries.filter((s: DriverSalaryRow) => s.payment_status === 'pending');
  const pendingAmount = pending.reduce((s: number, r: DriverSalaryRow) => s + r.net_amount, 0);
  const lastPaid = salaries.find((s: DriverSalaryRow) => s.payment_status === 'paid');

  return (
    <div className="erp-card rounded-2xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Mes salaires</p>
          {isLoading ? (
            <p className="text-xs text-white/40">Chargement...</p>
          ) : (
            <p className="text-xs text-white/45">
              {pending.length > 0
                ? `${pending.length} en attente — ${formatFinanceEuro(pendingAmount)}`
                : lastPaid
                  ? `Dernier paiement : ${formatFinanceEuro(lastPaid.net_amount)}`
                  : 'Aucun enregistrement'}
            </p>
          )}
        </div>
      </div>
      <Link to="/salaries" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
        Voir <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
