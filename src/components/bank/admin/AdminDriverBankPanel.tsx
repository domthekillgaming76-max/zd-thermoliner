import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Landmark, Loader2, Send, Users, Wallet, Filter,
} from 'lucide-react';
import { fmtEuro } from '../../../lib/format';
import { queryKeys } from '../../../lib/queryKeys';
import {
  TRANSFER_TYPE_LABELS,
  type CompanyTransferType,
} from '../../../lib/driverBankTypes';
import {
  adminTransferToDriver,
  fetchAllDriverBankAccounts,
  fetchCompanyBankTransfers,
} from '../../../services/driverBankService';
import { fetchDriverSalaries } from '../../../services/financeService';
import { FormAlert } from '../../erp/FormAlert';

export function AdminDriverBankPanel() {
  const queryClient = useQueryClient();
  const [driverFilter, setDriverFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [transferType, setTransferType] = useState<CompanyTransferType>('manual_transfer');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedSalaryId, setSelectedSalaryId] = useState('');

  const accountsQuery = useQuery({
    queryKey: queryKeys.driverBank.adminAccounts(),
    queryFn: fetchAllDriverBankAccounts,
    refetchInterval: 5_000,
  });

  const transfersQuery = useQuery({
    queryKey: queryKeys.driverBank.adminTransfers(),
    queryFn: () => fetchCompanyBankTransfers(150),
    refetchInterval: 5_000,
  });

  const salariesQuery = useQuery({
    queryKey: queryKeys.finance.salaries('pending'),
    queryFn: () => fetchDriverSalaries().then(s => s.filter(r => r.payment_status === 'pending')),
  });

  const transferMutation = useMutation({
    mutationFn: (input: Parameters<typeof adminTransferToDriver>[0]) => adminTransferToDriver(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.driverBank.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bank.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      setSuccess('Virement effectué — soldes mis à jour.');
      setAmount('');
      setReason('');
      setReference('');
      setComment('');
      setSelectedSalaryId('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const accounts = accountsQuery.data ?? [];
  const filteredAccounts = useMemo(() => {
    const q = driverFilter.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(a =>
      a.holder_name.toLowerCase().includes(q)
      || (a.holder_pseudo ?? '').toLowerCase().includes(q)
      || a.account_number.toLowerCase().includes(q),
    );
  }, [accounts, driverFilter]);

  const filteredTransfers = useMemo(() => {
    const list = transfersQuery.data ?? [];
    return list.filter(t => typeFilter === 'all' || t.type === typeFilter);
  }, [transfersQuery.data, typeFilter]);

  const totalDriverBalances = accounts.reduce((s, a) => s + a.balance, 0);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = parseFloat(amount);
    if (!selectedProfileId) { setError('Sélectionnez un chauffeur.'); return; }
    if (!parsed || parsed <= 0) { setError('Montant invalide.'); return; }
    if (!reason.trim()) { setError('Indiquez un motif.'); return; }

    await transferMutation.mutateAsync({
      targetProfileId: selectedProfileId,
      type: transferType,
      amount: parsed,
      reason: reason.trim(),
      reference: reference.trim() || undefined,
      adminComment: comment.trim() || undefined,
      salaryHistoryId: selectedSalaryId || undefined,
    });
  }

  function handlePaySalary(salaryId: string, driverId: string, netAmount: number, label: string) {
    const acc = accounts.find(a => a.driver_id === driverId);
    if (!acc) { setError('Compte bancaire chauffeur introuvable.'); return; }
    setSelectedProfileId(acc.profile_id);
    setTransferType('salary');
    setAmount(String(netAmount));
    setReason(`Salaire RP — ${label}`);
    setSelectedSalaryId(salaryId);
  }

  return (
    <div className="space-y-6 bank-fade-in">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bank-glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
            <Users className="w-4 h-4" /> Comptes chauffeurs
          </div>
          <p className="text-2xl font-black text-white">{accounts.length}</p>
        </div>
        <div className="bank-glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
            <Wallet className="w-4 h-4" /> Total soldes chauffeurs
          </div>
          <p className="text-2xl font-black text-white">{fmtEuro(totalDriverBalances)}</p>
        </div>
        <div className="bank-glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-2">
            <Landmark className="w-4 h-4" /> Virements
          </div>
          <p className="text-2xl font-black text-white">{filteredTransfers.length}</p>
        </div>
      </div>

      {error && <FormAlert message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        <form onSubmit={handleTransfer} className="bank-glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-red-400" /> Faire un virement chauffeur
          </h3>

          <div>
            <label className="text-xs text-white/40 uppercase font-bold">Chauffeur</label>
            <select
              className="erp-select w-full mt-1"
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.profile_id}>
                  {a.holder_name} — {fmtEuro(a.balance)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase font-bold">Type</label>
              <select className="erp-select w-full mt-1" value={transferType} onChange={e => setTransferType(e.target.value as CompanyTransferType)}>
                {Object.entries(TRANSFER_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase font-bold">Montant (€)</label>
              <input className="erp-input w-full mt-1" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase font-bold">Motif</label>
            <input className="erp-input w-full mt-1" value={reason} onChange={e => setReason(e.target.value)} required />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase font-bold">Référence</label>
              <input className="erp-input w-full mt-1" value={reference} onChange={e => setReference(e.target.value)} placeholder="Auto si vide" />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase font-bold">Commentaire admin</label>
              <input className="erp-input w-full mt-1" value={comment} onChange={e => setComment(e.target.value)} />
            </div>
          </div>

          <button
            type="submit"
            disabled={transferMutation.isPending}
            className="w-full btn-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {transferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Valider le virement RP
          </button>
        </form>

        <div className="bank-glass-panel rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Salaires en attente</h3>
          {(salariesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-white/35">Aucun salaire en attente.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(salariesQuery.data ?? []).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.driver_name}</p>
                    <p className="text-xs text-white/40">
                      {s.period_month}/{s.period_year} — {fmtEuro(s.net_amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePaySalary(s.id, s.driver_id, s.net_amount, `${s.period_month}/${s.period_year}`)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    Verser
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bank-glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4" /> Comptes chauffeurs
          </h3>
          <input
            className="erp-input text-sm max-w-xs"
            placeholder="Filtrer chauffeur…"
            value={driverFilter}
            onChange={e => setDriverFilter(e.target.value)}
          />
        </div>
        {accountsQuery.isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase text-white/35 border-b border-white/5">
                  <th className="pb-2 pr-3">Chauffeur</th>
                  <th className="pb-2 pr-3">IBAN RP</th>
                  <th className="pb-2 pr-3">Statut</th>
                  <th className="pb-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(a => (
                  <tr key={a.id} className="border-b border-white/[0.03]">
                    <td className="py-2 pr-3 text-white">{a.holder_name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-emerald-300">{a.rp_iban}</td>
                    <td className="py-2 pr-3 text-white/40">{a.status}</td>
                    <td className="py-2 text-right font-bold text-emerald-400">{fmtEuro(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bank-glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-white/40" />
          <select className="erp-select text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Tous les types</option>
            {Object.entries(TRANSFER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-white/35 border-b border-white/5">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Chauffeur</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Motif</th>
                <th className="pb-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map(t => (
                <tr key={t.id} className="border-b border-white/[0.03]">
                  <td className="py-2 pr-3 text-white/50 text-xs">{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2 pr-3 text-white">{t.holder_name ?? '—'}</td>
                  <td className="py-2 pr-3 text-white/40">{TRANSFER_TYPE_LABELS[t.type]}</td>
                  <td className="py-2 pr-3 text-white/60">{t.reason}</td>
                  <td className="py-2 text-right font-bold text-emerald-400">{fmtEuro(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
