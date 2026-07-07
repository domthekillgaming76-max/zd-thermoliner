import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Layout } from '../components/Layout';
import {
  DEFAULT_FILTERS,
  exportTransactionsCsv,
  exportTransactionsPdf,
  filterTransactions,
  PERIOD_OPTIONS,
} from '../components/bank/bankFilters';
import {
  EMPTY_MANUAL_FORM,
  ManualTransactionModal,
  type ManualTransactionForm,
} from '../components/bank/ManualTransactionModal';
import { BankLoungeHeader } from '../components/bank/lounge/BankLoungeHeader';
import { BankExpenseBreakdown } from '../components/bank/lounge/BankExpenseBreakdown';
import { BankQuickActions, type QuickActionId } from '../components/bank/lounge/BankQuickActions';
import { BankCardsModal } from '../components/bank/lounge/BankCardsModal';
import { downloadRib, printBankStatement } from '../components/bank/lounge/bankLoungeUtils';
import { BankAccountEnterprise } from '../components/bank/enterprise/BankAccountEnterprise';
import { BankPaymentCard3D } from '../components/bank/enterprise/BankPaymentCard3D';
import { BankKpiLive } from '../components/bank/enterprise/BankKpiLive';
import { BankNavTabs, type BankTabId } from '../components/bank/enterprise/BankNavTabs';
import { BankTreasuryPanel } from '../components/bank/enterprise/BankTreasuryPanel';
import { BankTransactionsEnterprise } from '../components/bank/enterprise/BankTransactionsEnterprise';
import { BankFleetFinancing } from '../components/bank/enterprise/BankFleetFinancing';
import { BankTransfersPanel } from '../components/bank/enterprise/BankTransfersPanel';
import { BankNotificationsPanel } from '../components/bank/enterprise/BankNotificationsPanel';
import { BankAdvisorEnterprise } from '../components/bank/enterprise/BankAdvisorEnterprise';
import { BankSettingsPanel } from '../components/bank/enterprise/BankSettingsPanel';
import { BankAutoSyncPanel } from '../components/bank/enterprise/BankAutoSyncPanel';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { useAuth } from '../contexts/AuthContext';
import { computeExpenseBreakdownFromTransactions } from '../lib/transactionAnalytics';
import { monthKey } from '../lib/format';
import { DEFAULT_BANK_SETTINGS, type BankSettings } from '../lib/bankSettings';
import {
  useBankData,
  useBankSettings,
  useCreateTransaction,
  useCreateTransfer,
  useDeleteTransaction,
} from '../hooks/useBankData';
import type { TransactionFilters } from '../services/bankService';

const EMPTY_SUMMARY = {
  balance: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  netProfit: 0,
  netCashflow: 0,
  pendingPayments: 0,
  transactionCount: 0,
};

export function BankPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<BankTabId>('dashboard');
  const [filters, setFilters] = useState<TransactionFilters>({ ...DEFAULT_FILTERS });
  const [showModal, setShowModal] = useState(false);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [form, setForm] = useState<ManualTransactionForm>(EMPTY_MANUAL_FORM);
  const [settingsDraft, setSettingsDraft] = useState<BankSettings>(DEFAULT_BANK_SETTINGS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, isFetching } = useBankData();
  const { settings, saveSettings, saving: savingSettings } = useBankSettings();

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);
  const createMutation = useCreateTransaction(user?.id);
  const transferMutation = useCreateTransfer(user?.id);
  const deleteMutation = useDeleteTransaction(user?.id);

  const filteredTransactions = useMemo(
    () => filterTransactions(data?.transactions ?? [], filters),
    [data?.transactions, filters],
  );

  const expenseBreakdown = useMemo(
    () => computeExpenseBreakdownFromTransactions(data?.transactions ?? [], monthKey()),
    [data?.transactions],
  );

  const summary = data?.summary ?? EMPTY_SUMMARY;
  const loading = isLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPageError(null);
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setPageError('Indiquez un montant supérieur à 0.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        type: form.type,
        amount,
        description: form.description,
        category: form.category,
        date: form.date,
      });
      setShowModal(false);
      setForm(EMPTY_MANUAL_FORM);
      setSuccessMessage(form.type === 'income' ? 'Encaissement enregistré.' : 'Décaissement enregistré.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette transaction manuelle ?')) return;
    setPageError(null);
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      setSuccessMessage('Transaction supprimée.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Impossible de supprimer.');
    } finally {
      setDeletingId(null);
    }
  }

  function openTransferModal() {
    setTab('transfers');
  }

  function handleQuickAction(id: QuickActionId) {
    switch (id) {
      case 'transfer':
        setTab('transfers');
        break;
      case 'cards':
        setShowCardsModal(true);
        break;
      case 'debits':
        setTab('transactions');
        setFilters({ ...DEFAULT_FILTERS, categoryGroup: 'expense' });
        break;
      case 'rib':
        downloadRib(data?.account ?? null);
        setSuccessMessage('RIB téléchargé.');
        break;
      case 'statement':
        printBankStatement(data?.account ?? null, filteredTransactions, summary);
        break;
    }
  }

  async function handleTransfer(input: {
    kind: import('../services/bankTransferService').TransferKind;
    amount: number;
    beneficiary: string;
    reference: string;
    scheduledDate?: string;
  }) {
    setPageError(null);
    try {
      await transferMutation.mutateAsync(input);
      setSuccessMessage('Virement enregistré avec succès.');
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Échec du virement.');
    }
  }

  function handleSaveSettings() {
    saveSettings(settingsDraft)
      .then(() => setSuccessMessage('Paramètres enregistrés.'))
      .catch(() => setPageError('Impossible d\'enregistrer les paramètres.'));
  }

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === filters.period)?.label ?? 'Tout';

  return (
    <Layout>
      <div className="bank-lounge space-y-6 pb-8">
        <BankLoungeHeader userName={user?.email} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <BankNavTabs active={tab} onChange={setTab} />
          {isFetching && !loading && (
            <span className="flex items-center gap-2 text-xs text-white/40">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Actualisation live...
            </span>
          )}
        </div>

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
        {isError && (
          <FormAlert message={error instanceof Error ? error.message : 'Erreur de chargement bancaire.'} />
        )}

        {tab === 'dashboard' && (
          <div className="space-y-6 bank-fade-in">
            <BankKpiLive summary={summary} treasury={data?.treasury ?? { chartData: [], availableCash: 0, forecastNextMonth: 0, forecastTrend: 'flat', monthlyBalanceSeries: [] }} loading={loading} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-5">
                <BankAccountEnterprise
                  account={data?.accountView ?? {
                    companyName: 'Z&D Thermoliner',
                    availableBalance: 0,
                    accountingBalance: 0,
                    liveBalance: 0,
                    iban: '—',
                    bic: '—',
                    accountNumber: '—',
                    lastSynchronization: null,
                  }}
                  loading={loading}
                  onTransfer={openTransferModal}
                  onCopyIban={() => setSuccessMessage('IBAN copié.')}
                />
                <BankPaymentCard3D loading={loading} />
              </div>
              <div className="lg:col-span-7 space-y-5">
                <BankQuickActions onAction={handleQuickAction} />
                <BankAutoSyncPanel autoSync={data?.autoSync ?? { revenue: 0, fuel: 0, tolls: 0, repairs: 0, insurance: 0, salary: 0, netProfit: 0, sheetCount: 0 }} loading={loading} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BankNotificationsPanel notifications={data?.notifications ?? []} compact />
                  <BankAdvisorEnterprise />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-4">
                <BankExpenseBreakdown breakdown={expenseBreakdown} loading={loading} />
              </div>
              <div className="xl:col-span-8">
                <BankTreasuryPanel chartData={data?.chartData ?? []} treasury={data?.treasury ?? { chartData: [], availableCash: 0, forecastNextMonth: 0, forecastTrend: 'flat', monthlyBalanceSeries: [] }} loading={loading} />
              </div>
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="bank-fade-in">
            <BankTransactionsEnterprise
              transactions={filteredTransactions}
              filters={filters}
              onChange={setFilters}
              loading={loading}
              deletingId={deletingId}
              onDelete={handleDelete}
              onExportCsv={() => exportTransactionsCsv(filteredTransactions)}
              onExportPdf={() =>
                exportTransactionsPdf(filteredTransactions, {
                  companyName: data?.accountView?.companyName ?? 'Z&D Thermoliner',
                  iban: data?.accountView?.iban ?? '—',
                  period: periodLabel,
                })
              }
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => { setForm(EMPTY_MANUAL_FORM); setShowModal(true); }}
                className="bank-lounge-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              >
                <Plus className="w-4 h-4" />
                Nouvelle opération
              </button>
            </div>
          </div>
        )}

        {tab === 'treasury' && (
          <div className="space-y-4 bank-fade-in">
            <BankKpiLive summary={summary} treasury={data?.treasury ?? { chartData: [], availableCash: 0, forecastNextMonth: 0, forecastTrend: 'flat', monthlyBalanceSeries: [] }} loading={loading} />
            <BankTreasuryPanel chartData={data?.chartData ?? []} treasury={data?.treasury ?? { chartData: [], availableCash: 0, forecastNextMonth: 0, forecastTrend: 'flat', monthlyBalanceSeries: [] }} loading={loading} />
            <BankExpenseBreakdown breakdown={expenseBreakdown} loading={loading} />
            <BankAutoSyncPanel autoSync={data?.autoSync ?? { revenue: 0, fuel: 0, tolls: 0, repairs: 0, insurance: 0, salary: 0, netProfit: 0, sheetCount: 0 }} loading={loading} />
          </div>
        )}

        {tab === 'financing' && (
          <div className="bank-fade-in">
            <BankFleetFinancing financing={data?.financing ?? { loans: [], totalRemaining: 0, totalMonthly: 0, truckCount: 0, trailerCount: 0 }} loading={loading} />
          </div>
        )}

        {tab === 'transfers' && (
          <div className="bank-fade-in">
            <BankTransfersPanel onSubmit={handleTransfer} saving={transferMutation.isPending} />
          </div>
        )}

        {tab === 'settings' && (
          <div className="bank-fade-in">
            <BankSettingsPanel
              settings={settingsDraft}
              iban={data?.accountView?.iban ?? ''}
              onChange={setSettingsDraft}
              onSave={handleSaveSettings}
              saving={savingSettings}
            />
          </div>
        )}
      </div>

      <ManualTransactionModal
        open={showModal}
        form={form}
        saving={createMutation.isPending}
        onClose={() => setShowModal(false)}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
      <BankCardsModal open={showCardsModal} onClose={() => setShowCardsModal(false)} />
    </Layout>
  );
}
