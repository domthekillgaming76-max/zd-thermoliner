import {
  CreditCard, Landmark, Receipt, Wallet, ArrowDownCircle, ArrowUpCircle,
  Loader2, FileText, Download, Plus,
} from 'lucide-react';
import { useState } from 'react';
import { fmtEuro } from '../../lib/format';
import { TRANSFER_TYPE_LABELS } from '../../lib/driverBankTypes';
import type { DriverBankBundle, DriverPersonalDebitInput } from '../../lib/driverBankTypes';
import { exportDriverBankStatementPdf, exportEnhancedPayslipPdf } from '../../lib/driverBankPdf';
import { DriverDebitModal, PERSONAL_DEBIT_CATEGORIES, type DriverDebitForm } from './DriverDebitModal';

interface DriverBankPanelProps {
  bundle: DriverBankBundle | undefined;
  loading?: boolean;
  debitSaving?: boolean;
  onCreateDebit?: (input: DriverPersonalDebitInput) => Promise<unknown>;
}

const TX_ICONS = {
  credit: ArrowDownCircle,
  debit: ArrowUpCircle,
};

export function DriverBankPanel({ bundle, loading, debitSaving = false, onCreateDebit }: DriverBankPanelProps) {
  const [debitOpen, setDebitOpen] = useState(false);
  const [debitError, setDebitError] = useState<string | null>(null);
  const [debitSuccess, setDebitSuccess] = useState<string | null>(null);
  const [debitForm, setDebitForm] = useState<DriverDebitForm>({
    amount: '',
    label: '',
    category: PERSONAL_DEBIT_CATEGORIES[0],
  });
  if (loading) {
    return (
      <div className="erp-card rounded-2xl p-12 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm text-white/40">Chargement du compte bancaire…</p>
      </div>
    );
  }

  if (!bundle?.account) {
    return (
      <div className="erp-card rounded-2xl p-8 border border-amber-500/20">
        <p className="text-sm text-white/50">
          Compte bancaire en cours d&apos;activation. Rechargez dans quelques instants.
        </p>
      </div>
    );
  }

  const { account, transactions, payslips, companyCard, openingBalance, closingBalance } = bundle;

  async function submitDebit(event: React.FormEvent) {
    event.preventDefault();
    if (!onCreateDebit) return;
    setDebitError(null);
    const amount = Number(debitForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setDebitError('Montant invalide.');
    if (amount > account.balance) return setDebitError('Solde insuffisant.');
    try {
      await onCreateDebit({ amount, label: debitForm.label.trim(), category: debitForm.category });
      setDebitSuccess(`Opération enregistrée : -${fmtEuro(amount)}`);
      setDebitOpen(false);
      setDebitForm({ amount: '', label: '', category: PERSONAL_DEBIT_CATEGORIES[0] });
    } catch (error) {
      setDebitError(error instanceof Error ? error.message : 'Décaissement impossible.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="driver-glass rounded-2xl p-5 border border-emerald-500/15">
        <div className="flex items-center gap-3 mb-4">
          <Landmark className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-black text-white">Mon compte bancaire RP</h2>
            <p className="text-xs text-white/40">{account.bank_name} — simulation ETS2/ATS</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-950/80 to-black/60 border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Wallet className="w-4 h-4" /> Solde disponible
            </div>
            <p className="text-3xl font-black text-white">{fmtEuro(account.balance)}</p>
            <p className="text-xs text-white/35 mt-2">Statut : {account.status}</p>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/8 p-5 space-y-2 text-sm">
            <p><span className="text-white/40">Titulaire :</span> <strong className="text-white">{account.holder_name}</strong></p>
            {account.holder_pseudo && <p><span className="text-white/40">Pseudo :</span> @{account.holder_pseudo}</p>}
            <p><span className="text-white/40">IBAN RP :</span> <span className="font-mono text-emerald-300">{account.rp_iban}</span></p>
            <p><span className="text-white/40">N° compte :</span> <span className="font-mono">{account.account_number}</span></p>
            <p><span className="text-white/40">Ouvert le :</span> {new Date(account.opened_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {debitSuccess && <p className="mt-4 rounded-xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">{debitSuccess}</p>}
        {onCreateDebit && (
          <button
            type="button"
            onClick={() => { setDebitError(null); setDebitSuccess(null); setDebitOpen(true); }}
            className="mt-4 mr-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle opération
          </button>
        )}
        <button
          type="button"
          onClick={() => exportDriverBankStatementPdf(account, transactions, openingBalance, closingBalance)}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger relevé PDF
        </button>
      </div>

      {companyCard && (
        <div className="erp-card rounded-2xl p-5 border border-red-500/10">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">Carte entreprise Crédit Agricole</h3>
          </div>
          <p className="font-mono text-lg text-white/80 tracking-widest">{companyCard.masked_number}</p>
          <p className="text-xs text-white/40 mt-1">{companyCard.bank_name} — {companyCard.holder_name}</p>
        </div>
      )}

      <div className="erp-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Dernières transactions</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-white/35">Aucune opération pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/35 border-b border-white/5">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Libellé</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map(tx => {
                  const Icon = TX_ICONS[tx.direction];
                  return (
                    <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3 text-white/50 text-xs">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-2.5 pr-3 text-white">{tx.label}</td>
                      <td className="py-2.5 pr-3 text-white/40 text-xs">
                        {TRANSFER_TYPE_LABELS[tx.type as keyof typeof TRANSFER_TYPE_LABELS] ?? tx.type}
                      </td>
                      <td className={`py-2.5 text-right font-bold flex items-center justify-end gap-1 ${tx.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {tx.direction === 'credit' ? '+' : '-'}{fmtEuro(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payslips.length > 0 && (
        <div className="erp-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">Fiches de paie liées</h3>
          </div>
          <div className="space-y-2">
            {payslips.slice(0, 6).map(ps => {
              const label = new Date(ps.year, ps.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
              return (
                <div key={ps.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04]">
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/40">Net : {fmtEuro(ps.net_amount)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportEnhancedPayslipPdf({
                      driverName: account.holder_name,
                      pseudo: account.holder_pseudo,
                      email: account.holder_email,
                      iban: account.rp_iban,
                      payslip: ps,
                      paymentReference: ps.payment_reference ?? ps.transaction_reference ?? null,
                      paymentDate: ps.payment_date ?? null,
                    })}
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <DriverDebitModal
        open={debitOpen}
        balance={account.balance}
        form={debitForm}
        saving={debitSaving}
        error={debitError}
        onChange={setDebitForm}
        onClose={() => { if (!debitSaving) setDebitOpen(false); }}
        onSubmit={submitDebit}
      />
    </div>
  );
}
