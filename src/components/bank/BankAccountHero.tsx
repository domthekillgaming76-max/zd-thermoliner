import { Building2, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/bankUtils';
import type { CompanyBankAccount } from '../../lib/supabase';
import type { BankSummary } from '../../services/bankService';

interface BankAccountHeroProps {
  account: CompanyBankAccount | null;
  summary: BankSummary;
  loading?: boolean;
}

export function BankAccountHero({ account, summary, loading }: BankAccountHeroProps) {
  const positive = summary.balance >= 0;

  return (
    <div
      className="erp-card rounded-2xl p-6 md:p-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a0505 0%, #0d0d0d 100%)',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 85% 40%, rgba(239,68,68,0.12) 0%, transparent 55%)',
        }}
      />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <Building2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">
                Compte entreprise
              </p>
              <p className="text-white font-bold text-lg">
                {account?.account_name ?? 'Z&D Thermoliner'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-white/35 text-sm mb-1">Solde disponible</p>
            {loading ? (
              <div className="h-12 w-48 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ) : (
              <p className={`text-4xl md:text-5xl font-black ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {positive ? '+' : ''}{formatCurrency(summary.balance)} €
              </p>
            )}
          </div>

          {account?.iban_rp && (
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <CreditCard className="w-4 h-4" />
              <span className="font-mono tracking-wide">{account.iban_rp}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-6">
          <HeroStat label="Revenus du mois" value={summary.monthlyIncome} color="#34d399" prefix="+" loading={loading} />
          <HeroStat label="Dépenses du mois" value={summary.monthlyExpenses} color="#ef4444" prefix="-" loading={loading} />
          <HeroStat
            label="Flux net"
            value={summary.netCashflow}
            color={summary.netCashflow >= 0 ? '#60a5fa' : '#f97316'}
            prefix={summary.netCashflow >= 0 ? '+' : ''}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  color,
  prefix,
  loading,
}: {
  label: string;
  value: number;
  color: string;
  prefix?: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-24 rounded-lg shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : (
        <p className="text-lg font-black" style={{ color }}>
          {prefix}{formatCurrency(Math.abs(value))} €
        </p>
      )}
    </div>
  );
}
