import { ArrowRightLeft, Copy, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../lib/bankUtils';
import { BANK_LOUNGE } from '../../../lib/bankLoungeTheme';
import type { CompanyBankAccount } from '../../../lib/supabase';
import type { BankSummary } from '../../../services/bankService';

interface BankAccountPanelProps {
  account: CompanyBankAccount | null;
  summary: BankSummary;
  loading?: boolean;
  onTransfer: () => void;
  onCopyIban?: () => void;
}

export function BankAccountPanel({
  account,
  summary,
  loading,
  onTransfer,
  onCopyIban,
}: BankAccountPanelProps) {
  const iban = account?.iban_rp ?? 'FR76 3000 2999 0000 0000 0000 000';
  const accountName = account?.account_name ?? 'Z&D Thermoliner';
  const availableBalance = summary.balance;
  const positive = summary.balance >= 0;

  function handleCopy() {
    navigator.clipboard.writeText(iban.replace(/\s/g, '')).catch(() => {});
    onCopyIban?.();
  }

  return (
    <section className="bank-lounge-panel rounded-2xl p-6 md:p-7">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(62, 191, 160, 0.12)' }}
        >
          <Wallet className="w-5 h-5" style={{ color: BANK_LOUNGE.tealLight }} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BANK_LOUNGE.tealLight }}>
            Compte principal
          </p>
          <p className="text-base font-bold" style={{ color: BANK_LOUNGE.white }}>
            {accountName}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-6">
        <BalanceBlock
          label="Solde du compte"
          value={summary.balance}
          loading={loading}
          positive={positive}
          large
        />
        <BalanceBlock
          label="Solde disponible"
          value={availableBalance}
          loading={loading}
          positive={availableBalance >= 0}
        />
      </div>

      <div
        className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ background: 'rgba(0, 0, 0, 0.2)', border: `1px solid ${BANK_LOUNGE.panelBorder}` }}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: BANK_LOUNGE.whiteMuted }}>
            IBAN
          </p>
          <p className="font-mono text-sm tracking-wide truncate" style={{ color: BANK_LOUNGE.white }}>
            {iban}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 self-start sm:self-center"
          style={{
            background: 'rgba(62, 191, 160, 0.12)',
            color: BANK_LOUNGE.tealLight,
            border: `1px solid ${BANK_LOUNGE.panelBorder}`,
          }}
        >
          <Copy className="w-3.5 h-3.5" />
          Copier
        </button>
      </div>

      <button
        type="button"
        onClick={onTransfer}
        className="bank-lounge-btn-primary w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <ArrowRightLeft className="w-4 h-4" />
        Faire un virement
      </button>
    </section>
  );
}

function BalanceBlock({
  label,
  value,
  loading,
  positive,
  large,
}: {
  label: string;
  value: number;
  loading?: boolean;
  positive: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: BANK_LOUNGE.whiteMuted }}>
        {label}
      </p>
      {loading ? (
        <div className="h-9 w-32 rounded-lg shimmer bank-lounge-shimmer" />
      ) : (
        <p
          className={`font-black ${large ? 'text-3xl md:text-4xl' : 'text-xl'}`}
          style={{ color: positive ? BANK_LOUNGE.tealLight : BANK_LOUNGE.redSoft }}
        >
          {positive && value > 0 ? '+' : ''}
          {formatCurrency(value)} €
        </p>
      )}
    </div>
  );
}
