import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FileText, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { FinanceInvoicesTable } from '../components/finance/FinanceInvoicesTable';
import { useAuth } from '../contexts/AuthContext';
import {
  useFinanceInvoices,
  useMarkFinanceInvoicePaid,
  useUpdateFinanceInvoiceStatus,
} from '../hooks/useFinance';
import { canAccessFinanceModule, canMarkInvoicePaid } from '../lib/financePermissions';
import { resolveFinanceInvoiceStatus } from '../lib/financeTypes';
import type { FinanceInvoiceStatus } from '../lib/financeTypes';

export function InvoicesPage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessFinanceModule(profile?.role, user?.email);
  const canPay = canMarkInvoicePaid(profile?.role, user?.email);
  const { data: invoices = [], isLoading, isError, error, refetch, isFetching } = useFinanceInvoices();
  const markPaid = useMarkFinanceInvoicePaid();
  const updateStatus = useUpdateFinanceInvoiceStatus();
  const [filter, setFilter] = useState<'all' | FinanceInvoiceStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: 'Accès réservé aux factures.' }} />;
  }

  const filtered = invoices.filter(inv => {
    if (filter === 'all') return true;
    return resolveFinanceInvoiceStatus(inv.payment_status, inv.due_date) === filter;
  });

  async function handleMarkPaid(id: string) {
    if (!user?.id) return;
    setBusyId(id);
    setPageError(null);
    try {
      await markPaid.mutateAsync({ invoiceId: id, userId: user.id });
      setSuccess('Facture marquée comme payée — transaction bancaire créée.');
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Erreur paiement facture.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkSent(id: string) {
    setBusyId(id);
    try {
      await updateStatus.mutateAsync({ id, status: 'sent' });
      setSuccess('Facture marquée comme envoyée.');
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Erreur mise à jour.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <PageHeader title="Factures" subtitle="Facturation automatique et suivi des paiements" icon={FileText} />
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
        {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}
        {isError && <FormAlert message={error instanceof Error ? error.message : 'Erreur chargement.'} />}

        <div className="flex flex-wrap gap-2">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === f ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'border-white/10 text-white/50 hover:text-white'
              }`}>
              {f === 'all' ? 'Toutes' : f === 'overdue' ? 'En retard' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="erp-card rounded-2xl h-64 shimmer" />
        ) : (
          <FinanceInvoicesTable
            invoices={filtered}
            canManage={canPay}
            onMarkPaid={handleMarkPaid}
            onMarkSent={handleMarkSent}
            busyId={busyId}
          />
        )}
      </div>
    </Layout>
  );
}
