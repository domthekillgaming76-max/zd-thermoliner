import { ArrowRightLeft, Copy, RefreshCw, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import { formatSyncTime } from '../../../lib/bankEnterprise';
import type { EnterpriseAccountView } from '../../../lib/bankEnterprise';
import { BankGlassPanel } from './BankGlassPanel';

interface BankAccountEnterpriseProps {
  account: EnterpriseAccountView;
  loading?: boolean;
  onTransfer: () => void;
  onCopyIban?: () => void;
}

export function BankAccountEnterprise({
  account,
  loading,
  onTransfer,
  onCopyIban,
}: BankAccountEnterpriseProps) {
  function copyIban() {
    navigator.clipboard.writeText(account.iban.replace(/\s/g, '')).catch(() => {});
    onCopyIban?.();
  }

  return (
    <BankGlassPanel className="p-6 md:p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bank-icon-well">
          <Wallet className="w-5 h-5 bank-lounge-accent-icon" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold bank-lounge-accent-icon">Compte professionnel</p>
          <p className="text-lg font-black text-white">{account.companyName}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <Metric label="Solde disponible" value={account.availableBalance} loading={loading} accent />
        <Metric label="Solde comptable" value={account.accountingBalance} loading={loading} />
        <Metric label="Solde en direct" value={account.liveBalance} loading={loading} live />
        <div className="rounded-xl p-4 bank-metric-well">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Dernière synchronisation</p>
          {loading ? (
            <div className="h-6 w-32 rounded shimmer bank-lounge-shimmer" />
          ) : (
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 bank-lounge-accent-icon" />
              {formatSyncTime(account.lastSynchronization)}
            </p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5 text-sm">
        <InfoField label="IBAN" value={account.iban} mono />
        <InfoField label="BIC" value={account.bic} mono />
        <InfoField label="N° compte" value={account.accountNumber} mono />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyIban} className="bank-lounge-btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Copy className="w-4 h-4" />
          Copier IBAN
        </button>
        <button type="button" onClick={onTransfer} className="bank-lounge-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold">
          <ArrowRightLeft className="w-4 h-4" />
          Faire un virement
        </button>
      </div>
    </BankGlassPanel>
  );
}

function Metric({
  label,
  value,
  loading,
  accent,
  live,
}: {
  label: string;
  value: number;
  loading?: boolean;
  accent?: boolean;
  live?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 bank-metric-well">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-2">
        {label}
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </p>
      {loading ? (
        <div className="h-8 w-28 rounded shimmer bank-lounge-shimmer" />
      ) : (
        <p className={`text-2xl font-black ${accent ? 'bank-lounge-accent-icon' : 'text-white'}`}>
          {formatCurrency(value)} €
        </p>
      )}
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl p-3 bank-metric-well">
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className={`text-xs text-white/80 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
