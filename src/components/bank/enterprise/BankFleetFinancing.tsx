import { Truck, Container } from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import type { FleetFinancingSummary } from '../../../services/bankFinancingService';
import { BankGlassPanel } from './BankGlassPanel';

interface BankFleetFinancingProps {
  financing: FleetFinancingSummary;
  loading?: boolean;
}

export function BankFleetFinancing({ financing, loading }: BankFleetFinancingProps) {
  if (loading) {
    return <BankGlassPanel className="p-6 h-64 shimmer bank-lounge-shimmer"><span className="sr-only">Chargement</span></BankGlassPanel>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Capital restant" value={`${formatCurrency(financing.totalRemaining)} €`} />
        <SummaryCard label="Mensualités totales" value={`${formatCurrency(financing.totalMonthly)} €`} />
        <SummaryCard label="Crédits camions" value={String(financing.truckCount)} />
        <SummaryCard label="Crédits remorques" value={String(financing.trailerCount)} />
      </div>

      <BankGlassPanel className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_100px_120px_120px_80px] gap-4 px-5 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider border-b border-white/5">
          <span>Actif financé</span>
          <span>Type</span>
          <span>Capital restant</span>
          <span>Mensualité</span>
          <span>Taux</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {financing.loans.map(loan => (
            <div
              key={loan.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_120px_80px] gap-2 md:gap-4 md:items-center px-4 md:px-5 py-4 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bank-icon-well">
                  {loan.asset_type === 'truck' ? (
                    <Truck className="w-4 h-4 bank-lounge-accent-icon" />
                  ) : (
                    <Container className="w-4 h-4 bank-lounge-accent-icon" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{loan.asset_name}</p>
                  <p className="text-xs text-white/35">{loan.lender}</p>
                </div>
              </div>
              <span className="text-xs text-white/50 capitalize">{loan.asset_type === 'truck' ? 'Camion' : 'Remorque'}</span>
              <span className="text-sm font-bold text-white">{formatCurrency(loan.remaining_capital)} €</span>
              <span className="text-sm font-bold bank-lounge-accent-icon">{formatCurrency(loan.monthly_payment)} €</span>
              <span className="text-xs text-white/45">{loan.interest_rate}%</span>
            </div>
          ))}
        </div>
      </BankGlassPanel>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <BankGlassPanel className="p-4">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </BankGlassPanel>
  );
}
